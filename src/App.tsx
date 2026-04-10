import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Auction } from './types';
import Navbar from './components/Navbar';
import AuctionCard from './components/AuctionCard';
import CreateAuctionModal from './components/CreateAuctionModal';
import AuctionDetails from './components/AuctionDetails';
import AdminDashboard from './components/AdminDashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Plus, Gavel, Search, TrendingUp, Clock, ShieldCheck, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user] = useAuthState(auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const auctionsQuery = query(
    collection(db, 'auctions'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const [auctionsValue, loading, error] = useCollection(auctionsQuery);
  const auctions = auctionsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auction)) || [];

  const filteredAuctions = auctions.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Hero Section */}
      <header className="relative bg-indigo-600 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
            >
              Onde cada lance é uma <span className="text-indigo-200">oportunidade.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg sm:text-xl text-indigo-100 mb-10 font-medium"
            >
              Participe de leilões em tempo real, dê seus lances e conquiste itens exclusivos com segurança e transparência.
            </motion.p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="O que você está procurando?" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-xl border-none focus:ring-4 focus:ring-indigo-300 outline-none transition-all text-gray-900 font-medium"
                />
              </div>
              <button 
                onClick={() => user ? setIsCreateModalOpen(true) : alert('Faça login para criar um leilão')}
                className="bg-indigo-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Vender um Item
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { icon: TrendingUp, title: 'Lances em Tempo Real', desc: 'Atualizações instantâneas em cada oferta.' },
            { icon: Clock, title: 'Tempo Determinado', desc: 'Leilões com prazo final rigoroso.' },
            { icon: ShieldCheck, title: 'Segurança Total', desc: 'Transações protegidas e transparentes.' }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <feature.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Auction Grid */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Leilões em Destaque</h2>
            <p className="text-gray-500 font-medium">Explore os itens mais disputados do momento.</p>
          </div>
          <div className="hidden sm:block text-sm font-bold text-indigo-600 hover:underline cursor-pointer">
            Ver todos os leilões →
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse">Carregando oportunidades...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center font-bold border border-red-100">
            Ocorreu um erro ao carregar os leilões. Por favor, tente novamente.
          </div>
        ) : filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map(auction => (
              <AuctionCard 
                key={auction.id} 
                auction={auction} 
                onClick={setSelectedAuction} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Gavel className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum leilão encontrado</h3>
            <p className="text-gray-500">Seja o primeiro a listar um item!</p>
            <button 
              onClick={() => user ? setIsCreateModalOpen(true) : alert('Faça login para criar um leilão')}
              className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Começar a Vender
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gavel className="w-6 h-6 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">Lance Certo</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 Lance Certo - O melhor app de leilões do Brasil.</p>
        </div>
      </footer>

      {/* Modals */}
      <CreateAuctionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <AnimatePresence>
        {selectedAuction && (
          <AuctionDetails 
            auction={selectedAuction} 
            onClose={() => setSelectedAuction(null)} 
          />
        )}
      </AnimatePresence>

      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}

      {isPrivacyOpen && (
        <PrivacyPolicy onClose={() => setIsPrivacyOpen(false)} />
      )}

      <footer className="bg-white border-t border-gray-100 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Gavel className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-black text-gray-900">Lance Certo</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-gray-400">
              <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-indigo-600 transition-colors">
                Política de Privacidade
              </button>
              <a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Suporte</a>
            </div>
            <p className="text-sm text-gray-400">© 2026 Lance Certo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
