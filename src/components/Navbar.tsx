import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, LogOut, Gavel, LayoutDashboard, Download } from 'lucide-react';

export default function Navbar({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [user] = useAuthState(auth);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const isAdmin = user?.email === "bobv1486@gmail.com";

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Usuário',
          email: result.user.email,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Gavel className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Lance Certo
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 transition-all font-bold text-sm"
              >
                <Download className="w-4 h-4" />
                Instalar App
              </button>
            )}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-all font-bold text-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">{user.displayName}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || ''} 
                    className="w-10 h-10 rounded-full border-2 border-indigo-100"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Google
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
