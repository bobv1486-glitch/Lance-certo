import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { Auction, Bid } from '../types';
import { X, Gavel, History, TrendingUp, AlertCircle, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuctionDetailsProps {
  auction: Auction;
  onClose: () => void;
}

export default function AuctionDetails({ auction, onClose }: AuctionDetailsProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [error, setError] = useState('');

  const bidsQuery = query(
    collection(db, `auctions/${auction.id}/bids`),
    orderBy('amount', 'desc'),
    limit(10)
  );
  const [bidsValue] = useCollection(bidsQuery);
  const bids = bidsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid)) || [];

  const isEnded = auction.endTime.toDate() < new Date() || auction.status === 'ended';
  const isSeller = auth.currentUser?.uid === auction.sellerId;
  const isWinner = auth.currentUser?.uid === auction.highestBidderId;

  const confirmPayment = async () => {
    setIsConfirmingPayment(true);
    setError('');
    try {
      const response = await fetch(`/api/auctions/${auction.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auth.currentUser?.uid }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error("Error confirming payment:", err);
      setError(err instanceof Error ? err.message : 'Erro ao confirmar pagamento.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth.currentUser) {
      setError('Você precisa estar logado para dar um lance.');
      return;
    }
    if (isSeller) {
      setError('Você não pode dar lances no seu próprio leilão.');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= auction.currentPrice) {
      setError(`O lance deve ser maior que ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice)}`);
      return;
    }

    setLoading(true);
    try {
      // 1. Call the secure backend API for bidding
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: auction.id,
          amount: amount,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anônimo',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }

      setBidAmount('');
    } catch (err) {
      console.error('Bid error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar lance. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Image Section */}
        <div className="md:w-1/2 bg-gray-50 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-100">
          {auction.imageUrl ? (
            <img 
              src={auction.imageUrl} 
              alt={auction.title} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Gavel className="w-32 h-32 text-gray-200" />
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-md hover:bg-white transition-all md:hidden"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
        </div>

        {/* Content Section */}
        <div className="md:w-1/2 flex flex-col overflow-hidden">
          <div className="p-6 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-900 leading-tight">{auction.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Vendido por <span className="font-semibold text-indigo-600">{auction.sellerName}</span></p>
            </div>
            <button 
              onClick={onClose}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="px-6 flex-1 overflow-y-auto space-y-6 pb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</h3>
              <p className="text-gray-600 leading-relaxed">{auction.description || 'Nenhuma descrição fornecida.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {isEnded ? 'Preço Final' : 'Lances Realizados'}
                </p>
                <p className="text-2xl font-black text-indigo-700">
                  {isEnded 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice)
                    : `${auction.bidCount || 0} lances`
                  }
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preço Inicial</p>
                <p className="text-2xl font-black text-gray-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.startingPrice)}
                </p>
              </div>
            </div>

            {/* Bidding History - Only visible after auction ends */}
            {isEnded && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-gray-900">Histórico de Lances</h3>
                </div>
                <div className="space-y-2">
                  {bids.length > 0 ? bids.map((bid, idx) => (
                    <div key={bid.id} className={`flex justify-between items-center p-3 rounded-xl ${idx === 0 ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{bid.bidderName}</p>
                          <p className="text-[10px] text-gray-400">{format(bid.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                      <p className={`font-black ${idx === 0 ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bid.amount)}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 italic text-center py-4">Nenhum lance registrado.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bid Form / Payment Flow */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            {isEnded ? (
              isWinner ? (
                auction.paymentStatus === 'paid' ? (
                  <div className="bg-green-50 text-green-700 p-6 rounded-2xl border border-green-100 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                    <h3 className="text-xl font-black mb-1">Pagamento Confirmado!</h3>
                    <p className="text-sm font-medium">O vendedor foi notificado e em breve enviará seu item.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <QrCode className="w-8 h-8" />
                        <h3 className="text-xl font-black">Pagar com PIX</h3>
                      </div>
                      <div className="bg-white p-4 rounded-2xl mb-4 flex justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PIX_SIMULADO_LANCE_CERTO_${auction.id}`} 
                          alt="QR Code PIX" 
                          className="w-32 h-32"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Valor a Pagar</p>
                        <p className="text-3xl font-black">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice)}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={confirmPayment}
                      disabled={isConfirmingPayment}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isConfirmingPayment ? 'Confirmando...' : 'Já realizei o pagamento'}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">
                      * Esta é uma simulação. Ao clicar, o sistema marcará como pago para fins de teste.
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  Leilão Encerrado
                </div>
              )
            ) : isSeller ? (
              <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-center">
                Você é o vendedor deste item.
              </div>
            ) : (
              <form onSubmit={placeBid} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Mínimo ${ (auction.currentPrice + 1).toFixed(2) }`}
                    className="w-full pl-10 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-lg font-bold"
                  />
                </div>
                {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <TrendingUp className="w-6 h-6" />
                  {loading ? 'Processando...' : 'Dar Lance Agora'}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
