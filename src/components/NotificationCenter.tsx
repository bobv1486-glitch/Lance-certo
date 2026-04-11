import { useState, useRef, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Bell, Check, Trash2, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  const notificationsQuery = user ? query(
    collection(db, 'notifications'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  ) : null;

  const [notificationsValue] = useCollection(notificationsQuery);
  const notifications = notificationsValue?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!notificationsValue) return;
    const batch = writeBatch(db);
    notificationsValue.docs.forEach(d => {
      if (!d.data().read) {
        batch.update(d.ref, { read: true });
      }
    });
    await batch.commit();
  };

  const clearAll = async () => {
    if (!notificationsValue) return;
    const batch = writeBatch(db);
    notificationsValue.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Ler todas
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors hover:bg-gray-50 flex gap-3 ${!n.read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-indigo-600' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {n.createdAt?.toDate() ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{n.message}</p>
                        <div className="flex items-center gap-3">
                          {!n.read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Marcar como lida
                            </button>
                          )}
                          {n.link && (
                            <a
                              href={n.link}
                              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver detalhes
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-medium">Nenhuma notificação por aqui.</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <button 
                onClick={clearAll}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                Limpar histórico
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
