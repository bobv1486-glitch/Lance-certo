import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Place Bid (Blind Auction Logic)
  // This would normally be handled by a secure backend to hide the current price
  app.post("/api/bids", async (req, res) => {
    const { auctionId, amount, userId, userName } = req.body;
    
    // 1. Validate Bid (Blindly)
    // 2. Check Anti-sniping (Last 3 mins -> +3 mins)
    // 3. Update Auction (currentPrice, bidCount, extensions)
    // 4. Store Bid
    
    res.json({ success: true, message: "Lance registrado com sucesso!" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
