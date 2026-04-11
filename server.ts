import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

export { app };

// Initialize Firebase Admin
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  console.log("Initializing Firebase Admin for project:", firebaseConfig.projectId);

  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });

  // Helper to get the correct Firestore instance
  const getFirestore = () => {
    if (firebaseConfig.firestoreDatabaseId) {
      return admin.firestore(firebaseConfig.firestoreDatabaseId);
    }
    return admin.firestore();
  };

  async function startServer() {
    try {
      console.log("Starting server...");
      const PORT = 3000;

      app.use(express.json());

      // API: Health Check
      app.get("/api/health", (req, res) => {
        res.json({ status: "ok" });
      });

      // API: Place Bid (Blind Auction Logic + Anti-Sniping)
      app.post("/api/bids", async (req, res) => {
        const { auctionId, amount, userId, userName } = req.body;
        
        try {
          const fsDb = getFirestore();
          const auctionRef = fsDb.doc(`auctions/${auctionId}`);
          
          await fsDb.runTransaction(async (transaction) => {
            const auctionDoc = await transaction.get(auctionRef);
            
            if (!auctionDoc.exists) {
              throw new Error("Leilão não encontrado.");
            }

            const auctionData = auctionDoc.data()!;
            const now = admin.firestore.Timestamp.now();
            const endTime = auctionData.endTime;

            // 1. Basic Validations
            if (auctionData.status !== 'active' || endTime.toMillis() < now.toMillis()) {
              throw new Error("Este leilão já foi encerrado.");
            }

            if (auctionData.sellerId === userId) {
              throw new Error("Você não pode dar lances no seu próprio leilão.");
            }

            if (amount <= auctionData.currentPrice) {
              throw new Error(`O lance deve ser maior que o preço atual.`);
            }

            // 2. Anti-sniping Logic (Sprint 2)
            // If bid is within 3 minutes of end, extend by 3 minutes
            const threeMinutesInMs = 3 * 60 * 1000;
            const timeRemaining = endTime.toMillis() - now.toMillis();
            
            let newEndTime = endTime;
            let extensionsUsed = auctionData.extensionsUsed || 0;

            if (timeRemaining < threeMinutesInMs) {
              const extensionMs = threeMinutesInMs;
              newEndTime = admin.firestore.Timestamp.fromMillis(endTime.toMillis() + extensionMs);
              extensionsUsed += 1;
            }

            // 3. Update Auction
            transaction.update(auctionRef, {
              currentPrice: amount,
              highestBidderId: userId,
              bidCount: (auctionData.bidCount || 0) + 1,
              endTime: newEndTime,
              extensionsUsed: extensionsUsed
            });

            // 4. Store Bid
            const bidRef = auctionRef.collection('bids').doc();
            transaction.set(bidRef, {
              auctionId,
              bidderId: userId,
              bidderName: userName,
              amount,
              createdAt: now
            });

            // 5. Create Notifications
            // Notify previous highest bidder
            if (auctionData.highestBidderId && auctionData.highestBidderId !== userId) {
              const outbidNotifRef = fsDb.collection('notifications').doc();
              transaction.set(outbidNotifRef, {
                userId: auctionData.highestBidderId,
                title: "Você foi superado!",
                message: `Seu lance no item "${auctionData.title}" foi superado por R$ ${amount}.`,
                type: 'outbid',
                link: `/auction/${auctionId}`,
                read: false,
                createdAt: now
              });
            }

            // Notify seller
            if (auctionData.sellerId !== userId) {
              const sellerNotifRef = fsDb.collection('notifications').doc();
              transaction.set(sellerNotifRef, {
                userId: auctionData.sellerId,
                title: "Novo lance recebido!",
                message: `Um novo lance de R$ ${amount} foi feito no seu item "${auctionData.title}".`,
                type: 'system',
                link: `/auction/${auctionId}`,
                read: false,
                createdAt: now
              });
            }
          });

          res.json({ success: true, message: "Lance registrado com sucesso!" });
        } catch (error: any) {
          console.error("Bid Error:", error);
          res.status(400).json({ success: false, message: error.message });
        }
      });

      // API: Confirm Payment
      app.post("/api/auctions/:id/confirm-payment", async (req, res) => {
        const { id } = req.params;
        const { userId } = req.body;

        try {
          const fsDb = getFirestore();
          const auctionRef = fsDb.doc(`auctions/${id}`);
          
          await fsDb.runTransaction(async (transaction) => {
            const auctionDoc = await transaction.get(auctionRef);
            if (!auctionDoc.exists) throw new Error("Leilão não encontrado.");
            
            const auctionData = auctionDoc.data()!;
            if (auctionData.highestBidderId !== userId) {
              throw new Error("Apenas o vencedor pode confirmar o pagamento.");
            }

            if (auctionData.paymentStatus === 'paid') {
              throw new Error("Pagamento já foi confirmado anteriormente.");
            }

            // Update status
            transaction.update(auctionRef, { paymentStatus: 'paid' });

            // Notify seller
            const sellerNotifRef = fsDb.collection('notifications').doc();
            transaction.set(sellerNotifRef, {
              userId: auctionData.sellerId,
              title: "Pagamento Confirmado! ✅",
              message: `O comprador do item "${auctionData.title}" confirmou o pagamento de R$ ${auctionData.currentPrice}.`,
              type: 'payment_received',
              link: `/auction/${id}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });

          res.json({ success: true });
        } catch (error: any) {
          res.status(400).json({ success: false, message: error.message });
        }
      });

      // API: Cron Task (for Vercel Cron or manual trigger)
      app.get("/api/cron/process-auctions", async (req, res) => {
        // Simple security check (optional, can be improved with a secret header)
        // if (req.headers['x-vercel-cron'] !== 'true') return res.status(401).end();
        
        try {
          await processExpiredAuctions();
          res.json({ success: true, message: "Auctions processed" });
        } catch (error: any) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // Vite middleware for development
      if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      // Only listen if not running as a serverless function
      if (process.env.VITE_VERCEL !== 'true') {
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      }
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  }

  startServer();

  async function processExpiredAuctions() {
    try {
      const fsDb = getFirestore();
      const now = admin.firestore.Timestamp.now();
      
      const expiredAuctionsQuery = await fsDb.collection('auctions')
        .where('status', '==', 'active')
        .where('endTime', '<=', now)
        .get();

      if (expiredAuctionsQuery.empty) return;

      console.log(`Processing ${expiredAuctionsQuery.size} expired auctions...`);

      for (const auctionDoc of expiredAuctionsQuery.docs) {
        const auctionData = auctionDoc.data();
        const auctionId = auctionDoc.id;

        await fsDb.runTransaction(async (transaction) => {
          // 1. Mark as ended
          transaction.update(auctionDoc.ref, { status: 'ended' });

          // 2. If there was a winner, process profits and notifications
          if (auctionData.highestBidderId) {
            const commission = auctionData.currentPrice * 0.07;
            const sellerProfit = auctionData.currentPrice * 0.93;

            // Update platform wallet
            const walletRef = fsDb.doc('platform/wallet');
            const walletDoc = await transaction.get(walletRef);
            const walletData = walletDoc.exists ? walletDoc.data()! : { totalProfit: 0, availableBalance: 0 };

            transaction.set(walletRef, {
              totalProfit: (walletData.totalProfit || 0) + commission,
              availableBalance: (walletData.availableBalance || 0) + commission,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Notify winner
            const winnerNotifRef = fsDb.collection('notifications').doc();
            transaction.set(winnerNotifRef, {
              userId: auctionData.highestBidderId,
              title: "Você venceu o leilão! 🏆",
              message: `Parabéns! Você arrematou o item "${auctionData.title}" por R$ ${auctionData.currentPrice}. Prossiga para o pagamento.`,
              type: 'auction_ended',
              link: `/auction/${auctionId}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Notify seller
            const sellerNotifRef = fsDb.collection('notifications').doc();
            transaction.set(sellerNotifRef, {
              userId: auctionData.sellerId,
              title: "Item vendido! 💰",
              message: `Seu item "${auctionData.title}" foi vendido por R$ ${auctionData.currentPrice}. O valor de R$ ${sellerProfit.toFixed(2)} será creditado após a confirmação.`,
              type: 'auction_ended',
              link: `/auction/${auctionId}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else {
            // Notify seller that auction ended with no bids
            const sellerNotifRef = fsDb.collection('notifications').doc();
            transaction.set(sellerNotifRef, {
              userId: auctionData.sellerId,
              title: "Leilão encerrado sem lances",
              message: `Seu leilão para "${auctionData.title}" encerrou sem ofertas. Você pode tentar listar o item novamente.`,
              type: 'auction_ended',
              link: `/auction/${auctionId}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        });
      }
    } catch (error) {
      console.error("Process Auctions Error:", error);
      throw error;
    }
  }

  // Background Task: Check for expired auctions every minute (only if not on Vercel)
  if (process.env.VITE_VERCEL !== 'true') {
    setInterval(processExpiredAuctions, 60000);
  }

} catch (initErr) {
  console.error("Failed to initialize Firebase Admin:", initErr);
  // Still start server even if admin fails, so the app can at least show an error or partial UI
  async function startFallbackServer() {
    const app = express();
    const PORT = 3000;
    app.get("/api/health", (req, res) => res.json({ status: "error", message: "Firebase Admin failed to initialize" }));
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Fallback server running on http://localhost:${PORT}`);
    });
  }
  startFallbackServer();
}
