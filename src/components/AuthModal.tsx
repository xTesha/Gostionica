import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ShowId, SHOWS, UserProfile } from '../types';
import { X, Lock, Mail, ShieldAlert, CheckCircle, Key, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  isForceAuth?: boolean;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, isForceAuth = false }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'email' | 'passcode'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'passcode') {
        // Predefined passcodes that elevate to Admin role
        const allowedPasscodes = ['9999', '1212', '7777', '2026'];
        if (!allowedPasscodes.includes(passcode.trim())) {
          throw new Error('Netačan sigurnosni passcode za administratorski pristup.');
        }

        const adminProfile: UserProfile = {
          uid: 'admin_predefined',
          email: 'glavni.administrator@tvstudija.com',
          displayName: 'Glavni Administrator',
          role: 'admin',
          assignedShow: 'all',
          createdAt: new Date().toISOString()
        };

        // Cache pre-provisioned admin inside Firestore (optional cache write, don't fail auth if permissions are restricted for unauthenticated clients)
        try {
          await setDoc(doc(db, 'users', 'admin_predefined'), adminProfile);
        } catch (e) {
          console.warn("Could not write predefined admin profile cache to Firestore:", e);
        }

        // Store standard session in localStorage so it persists reloads
        localStorage.setItem('predefined_admin_session', JSON.stringify(adminProfile));

        setSuccessMsg('Pristup odobren! Dobrodošli nazad, Glavni Uredniče.');
        setTimeout(() => {
          onAuthSuccess(adminProfile);
          onClose();
        }, 1200);

      } else {
        // Standard user login (email/password) using complete-removal custom credentials
        const targetEmail = email.trim().toLowerCase();
        let querySnapshot;
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', targetEmail));
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'users');
        }

        if (querySnapshot && !querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const profileData = userDoc.data() as UserProfile;
          
          if (profileData.isDeleted) {
            throw new Error('Vaš nalog je deaktiviran od strane administratora.');
          }

          if (profileData.password && profileData.password !== password) {
            throw new Error('Netačan email ili lozinka.');
          }

          // Save the editor session in localStorage
          localStorage.setItem('editor_session', JSON.stringify(profileData));

          onAuthSuccess(profileData);
          onClose();
        } else {
          // Fallback to standard Firebase Auth
          try {
            const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = credentials.user;

            let userDoc;
            try {
              userDoc = await getDoc(doc(db, 'users', user.uid));
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
            }

            if (userDoc && userDoc.exists()) {
              const profileData = userDoc.data() as UserProfile;
              localStorage.setItem('editor_session', JSON.stringify(profileData));
              onAuthSuccess(profileData);
              onClose();
            } else {
              const fallbackProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'Urednik',
                role: 'editor',
                assignedShow: ShowId.PRVE_INFO,
                password: password,
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', user.uid), fallbackProfile);
              localStorage.setItem('editor_session', JSON.stringify(fallbackProfile));
              onAuthSuccess(fallbackProfile);
              onClose();
            }
          } catch (firebaseAuthErr) {
            throw new Error('Netačan email ili lozinka.');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let localizedError = 'Došlo je do greške prilikom prijave.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        localizedError = 'Netačan email ili lozinka.';
      } else if (err.code === 'auth/invalid-email') {
        localizedError = 'Nevažeći format email adrese.';
      } else if (err.message) {
        localizedError = err.message;
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isForceAuth ? "w-full flex justify-center" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs"}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        {/* Header decoration */}
        <div className="h-1.5 bg-red-600" />

        <div className="p-6">
          {!isForceAuth && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer animate-none"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-serif font-black italic uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
              {authMode === 'passcode' ? 'Glavni Urednički Desk' : 'Urednički Pristup'}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {authMode === 'passcode'
                ? 'Unesite tajni passcode za administraciju sistema'
                : 'Prijavite se kako biste koordinirali gostovanja'}
            </p>
          </div>

          {/* Dual Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded mb-5">
            <button
              onClick={() => {
                setAuthMode('email');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                authMode === 'email'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Urednički Login
            </button>
            <button
              onClick={() => {
                setAuthMode('passcode');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                authMode === 'passcode'
                  ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Admin Passcode
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs"
            >
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'email' ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Vaša E-mail adresa
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="urednik@tvstanica.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Lozinka
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white text-xs"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Administratorski Passcode
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type={showPasscode ? "text" : "password"}
                    required
                    maxLength={12}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Unesite passcode"
                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded text-left font-mono text-sm tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3.5 top-3 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-white text-white font-mono font-bold text-xs uppercase tracking-widest rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'SLANJE...' : 'PRIJAVI SE'}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
