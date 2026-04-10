import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Auction } from '../types';
import { Gavel, Clock, User } from 'lucide-react';
import { motion } from 'motion/react';

interface AuctionCardProps {
  key?: string;
  auction: Auction;
  onClick: (auction: Auction) => void;
}

export default function AuctionCard({ auction, onClick }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const isEnded = auction.endTime.toDate() < new Date();

  useEffect(() => {
    const updateTimer = () => {
      if (isEnded) {
        setTimeLeft('Encerrado');
        return;
      }
      setTimeLeft(formatDistanceToNow(auction.endTime.toDate(), { locale: ptBR, addSuffix: true }));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [auction.endTime, isEnded]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all"
      onClick={() => onClick(auction)}
    >
      <div className="aspect-video bg-gray-100 relative">
        {auction.imageUrl ? (
          <img 
            src={auction.imageUrl} 
            alt={auction.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Gavel className="w-12 h-12 opacity-20" />
          </div>
        )}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          isEnded ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}>
          {isEnded ? 'Encerrado' : 'Ativo'}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{auction.title}</h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <User className="w-3 h-3" />
          <span>{auction.sellerName}</span>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {isEnded ? 'Preço Final' : 'Lances'}
            </p>
            <p className="text-xl font-black text-indigo-600">
              {isEnded 
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice)
                : `${auction.bidCount || 0} lances`
              }
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
              <Clock className="w-3 h-3" />
              <span>{isEnded ? 'Fim' : 'Termina'}</span>
            </div>
            <p className={`text-sm font-medium ${isEnded ? 'text-red-500' : 'text-gray-900'}`}>
              {timeLeft}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
