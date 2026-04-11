import React, { useState, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, Plus, Image as ImageIcon, TrendingUp, Upload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateAuctionModal({ isOpen, onClose }: CreateAuctionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [duration, setDuration] = useState('24'); // hours
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `auctions/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(duration));

      await addDoc(collection(db, 'auctions'), {
        title,
        description,
        startingPrice: parseFloat(startingPrice),
        currentPrice: parseFloat(startingPrice),
        imageUrl: finalImageUrl,
        sellerId: auth.currentUser.uid,
        sellerName: auth.currentUser.displayName || 'Vendedor',
        endTime: Timestamp.fromDate(endTime),
        createdAt: serverTimestamp(),
        status: 'active',
        bidCount: 0,
        extensionsUsed: 0,
      });
      
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setStartingPrice('');
      setImageUrl('');
      setImageFile(null);
    } catch (error) {
      console.error('Error creating auction:', error);
      alert('Erro ao criar leilão. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Criar Novo Leilão</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Informação de Venda
                </div>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  Ao listar seu item, você concorda com a taxa de comissão de <strong>7%</strong> sobre o valor final da venda, descontada automaticamente no encerramento.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título do Item</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: iPhone 15 Pro Max"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                  placeholder="Detalhes sobre o estado do item..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preço Inicial (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duração</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="1">1 Hora</option>
                    <option value="6">6 Horas</option>
                    <option value="12">12 Horas</option>
                    <option value="24">24 Horas</option>
                    <option value="48">48 Horas</option>
                    <option value="168">7 Dias</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Foto do Item
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all overflow-hidden"
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white font-bold text-sm flex items-center gap-2">
                          <Upload className="w-4 h-4" /> Alterar Foto
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="p-3 bg-gray-50 rounded-full inline-block mb-2">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-500">Clique para subir uma foto</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP até 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </div>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Listar Item para Leilão
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
