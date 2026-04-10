import { useState, useEffect } from 'react';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit, getDocs, where, addDoc, serverTimestamp, Timestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Auction } from '../types';
import { DollarSign, TrendingUp, Package, AlertCircle, ArrowUpRight, ArrowDownRight, Users, Database, Wallet, Landmark, History as HistoryIcon, Save, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet'>('overview');
  const [pixKey, setPixKey] = useState('');
  const [isSavingPix, setIsSavingPix] = useState(false);

  const [auctionsValue] = useCollection(query(collection(db, 'auctions'), orderBy('createdAt', 'desc')));
  const auctions = auctionsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auction)) || [];

  const [walletValue] = useDocument(doc(db, 'platform', 'wallet'));
  const walletData = walletValue?.data();

  const [withdrawalsValue] = useCollection(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(5)));
  const withdrawals = withdrawalsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  useEffect(() => {
    if (walletData?.withdrawalAccount) {
      setPixKey(walletData.withdrawalAccount);
    }
  }, [walletData]);

  const savePixKey = async () => {
    setIsSavingPix(true);
    try {
      await setDoc(doc(db, 'platform', 'wallet'), {
        withdrawalAccount: pixKey,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      alert('Conta para recebimento salva com sucesso!');
    } catch (error) {
      console.error("Error saving PIX:", error);
      alert('Erro ao salvar conta.');
    } finally {
      setIsSavingPix(false);
    }
  };

  const requestWithdrawal = async () => {
    if (!walletData?.availableBalance || walletData.availableBalance <= 0) {
      alert('Saldo insuficiente para saque.');
      return;
    }

    if (!walletData.withdrawalAccount) {
      alert('Por favor, cadastre uma conta para recebimento primeiro.');
      return;
    }

    if (!confirm(`Deseja solicitar o saque de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(walletData.availableBalance)}?`)) {
      return;
    }

    try {
      const amount = walletData.availableBalance;
      // 1. Create withdrawal record
      await addDoc(collection(db, 'withdrawals'), {
        amount,
        status: 'pending',
        accountInfo: walletData.withdrawalAccount,
        createdAt: serverTimestamp()
      });

      // 2. Reset balance
      await updateDoc(doc(db, 'platform', 'wallet'), {
        availableBalance: 0,
        lastUpdated: serverTimestamp()
      });

      alert('Solicitação de saque enviada! O valor cairá na sua conta em até 24h.');
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      alert('Erro ao processar saque.');
    }
  };

  const seedData = async () => {
    setIsSeeding(true);
    try {
      const sampleAuctions = [
        {
          title: "iPhone 15 Pro Max 256GB",
          description: "Estado de novo, na caixa com todos os acessórios.",
          imageUrl: "https://picsum.photos/seed/iphone/800/600",
          startingPrice: 4500,
          currentPrice: 5850,
          sellerId: "system_test",
          sellerName: "Vendedor Premium",
          endTime: Timestamp.fromDate(new Date(Date.now() + 86400000)), // 24h from now
          createdAt: serverTimestamp(),
          status: 'active',
          bidCount: 14,
          extensionsUsed: 0
        },
        {
          title: "MacBook Air M2 13'",
          description: "8GB RAM, 256GB SSD. Pouquíssimo uso.",
          imageUrl: "https://picsum.photos/seed/macbook/800/600",
          startingPrice: 6000,
          currentPrice: 7400,
          sellerId: "system_test",
          sellerName: "Tech Store",
          endTime: Timestamp.fromDate(new Date(Date.now() - 3600000)), // Ended 1h ago
          createdAt: serverTimestamp(),
          status: 'ended',
          bidCount: 28,
          extensionsUsed: 1
        },
        {
          title: "PlayStation 5 + 2 Controles",
          description: "Versão com disco, acompanha God of War Ragnarok.",
          imageUrl: "https://picsum.photos/seed/ps5/800/600",
          startingPrice: 2800,
          currentPrice: 3650,
          sellerId: "system_test",
          sellerName: "Gamer Shop",
          endTime: Timestamp.fromDate(new Date(Date.now() + 172800000)), // 48h from now
          createdAt: serverTimestamp(),
          status: 'active',
          bidCount: 9,
          extensionsUsed: 0
        },
        {
          title: "Câmera Sony Alpha A7 III",
          description: "Apenas o corpo, 15k cliques. Sensor impecável.",
          imageUrl: "https://picsum.photos/seed/sony/800/600",
          startingPrice: 9000,
          currentPrice: 11200,
          sellerId: "system_test",
          sellerName: "Foto Pro",
          endTime: Timestamp.fromDate(new Date(Date.now() - 7200000)), // Ended 2h ago
          createdAt: serverTimestamp(),
          status: 'ended',
          bidCount: 19,
          extensionsUsed: 2
        }
      ];

      for (const auction of sampleAuctions) {
        await addDoc(collection(db, 'auctions'), auction);
      }

      // Update wallet balance based on seeded data
      const seededProfit = (7400 + 11200) * 0.07;
      await setDoc(doc(db, 'platform', 'wallet'), {
        totalProfit: (walletData?.totalProfit || 0) + seededProfit,
        availableBalance: (walletData?.availableBalance || 0) + seededProfit,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      alert('Dados de teste gerados com sucesso!');
    } catch (error) {
      console.error("Error seeding data:", error);
      alert('Erro ao gerar dados de teste.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Stats calculation
  const completedAuctions = auctions.filter(a => a.status === 'ended');
  const activeAuctions = auctions.filter(a => a.status === 'active');
  
  const totalVolume = completedAuctions.reduce((acc, curr) => acc + curr.currentPrice, 0);
  const totalProfit = totalVolume * 0.07; // 7% commission
  
  const totalBids = auctions.reduce((acc, curr) => acc + (curr.bidCount || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Painel do Administrador</h1>
            <p className="text-gray-500">Visão geral dos lucros e atividades da plataforma.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={seedData}
              disabled={isSeeding}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Gerando...' : 'Gerar Dados de Teste'}
            </button>
            <button 
              onClick={onClose}
              className="bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              Voltar ao App
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'wallet' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
          >
            Minha Conta (Lucros)
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                title="Lucro Acumulado (7%)" 
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(walletData?.totalProfit || totalProfit)}
                icon={DollarSign}
                trend="+12.5%"
                color="indigo"
              />
              <StatCard 
                title="Volume de Vendas" 
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVolume)}
                icon={TrendingUp}
                trend="+8.2%"
                color="green"
              />
              <StatCard 
                title="Leilões Ativos" 
                value={activeAuctions.length.toString()}
                icon={Package}
                trend="Estável"
                color="blue"
              />
              <StatCard 
                title="Total de Lances" 
                value={totalBids.toString()}
                icon={Users}
                trend="+24%"
                color="purple"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity Table */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Leilões Recentes</h2>
                  <button className="text-sm font-bold text-indigo-600 hover:underline">Ver todos</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">Vendedor</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Valor Final</th>
                        <th className="px-6 py-4">Seu Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auctions.slice(0, 5).map(auction => (
                        <tr key={auction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                                {auction.imageUrl && <img src={auction.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                              </div>
                              <span className="font-bold text-gray-900">{auction.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{auction.sellerName}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              auction.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {auction.status === 'active' ? 'Ativo' : 'Encerrado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice)}
                          </td>
                          <td className="px-6 py-4 font-black text-indigo-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(auction.currentPrice * 0.07)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Profit Breakdown */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Distribuição de Lucros</h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                      <span className="text-sm font-medium text-gray-600">Comissão de Vendas (7%)</span>
                    </div>
                    <span className="font-bold text-gray-900">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full" />
                      <span className="text-sm font-medium text-gray-600">Taxas de Cancelamento (3.5%)</span>
                    </div>
                    <span className="font-bold text-gray-900">0%</span>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="bg-indigo-50 p-4 rounded-2xl flex items-center gap-4">
                      <AlertCircle className="w-8 h-8 text-indigo-600" />
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        <strong>Dica do Admin:</strong> Aumente o volume de leilões regionais para reduzir custos de logística e aumentar a satisfação dos usuários.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Wallet Balance & Withdrawal */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-indigo-600 rounded-2xl text-white">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Saldo Disponível</h2>
                  <p className="text-gray-500">Valor pronto para ser transferido para sua conta.</p>
                </div>
              </div>

              <div className="bg-gray-50 p-8 rounded-3xl mb-8 border border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Seu Saldo</p>
                <p className="text-5xl font-black text-indigo-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(walletData?.availableBalance || 0)}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Chave PIX para Recebimento</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="E-mail, CPF, Telefone ou Chave Aleatória"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <button 
                      onClick={savePixKey}
                      disabled={isSavingPix}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  </div>
                </div>

                <button 
                  onClick={requestWithdrawal}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  <Landmark className="w-6 h-6" />
                  Solicitar Saque Agora
                </button>
                <p className="text-center text-xs text-gray-400">
                  * O processamento de saques ocorre em até 24 horas úteis.
                </p>
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-8">
                <HistoryIcon className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Histórico de Saques</h2>
              </div>

              <div className="space-y-4">
                {withdrawals.length > 0 ? withdrawals.map((w: any) => (
                  <div key={w.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${w.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {w.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(w.amount)}</p>
                        <p className="text-[10px] text-gray-400">{w.createdAt?.toDate().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${w.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {w.status === 'completed' ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <HistoryIcon className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">Nenhum saque realizado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trend.includes('+') ? 'text-green-500' : 'text-gray-400'}`}>
          {trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}
