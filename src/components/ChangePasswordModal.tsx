import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { X, Lock, ShieldAlert, CheckCircle, Eye, EyeOff, Loader } from 'lucide-react';
import { UserProfile } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  userProfile: UserProfile | null;
}

export default function ChangePasswordModal({ isOpen, onClose, showToast, userProfile }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('Nova lozinka mora imati najmanje 6 karaktera.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nove lozinke se ne poklapaju.');
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    if (!userProfile) {
      setError('Korisnik nije prijavljen.');
      setLoading(false);
      return;
    }

    try {
      let updatedInFirestore = false;
      let isFirebaseAuthUser = false;

      // 1. Try to sign in with Firebase standard Auth first to verify if they are a standard Auth user,
      // and re-establish standard Auth session if it was not active. This guarantees we can call updatePassword.
      try {
        const userCredential = await signInWithEmailAndPassword(auth, userProfile.email, currentPassword);
        // Standard Auth user found and authenticated successfully!
        isFirebaseAuthUser = true;

        // Update password in Firebase standard Auth
        await updatePassword(userCredential.user, newPassword);

        // Update in Firestore as well
        const userDocRef = doc(db, 'users', userProfile.uid);
        await setDoc(userDocRef, {
          ...userProfile,
          password: newPassword
        });
        updatedInFirestore = true;
      } catch (authErr: any) {
        console.log("Firebase Auth verification check status (safe to proceed for custom db accounts):", authErr);
        
        // If the error is 'auth/wrong-password' or 'auth/invalid-credential', it means they ARE a Firebase Auth user
        // but entered the wrong password! We must stop and report wrong password.
        if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials') {
          setError('Netačna trenutna lozinka.');
          setLoading(false);
          return;
        }
        
        // Fallback for custom DB-only accounts (the user-not-found case, or when signup is not used)
      }

      // 2. If it's a custom DB-only user profile (or Firebase Auth didn't register them)
      if (!isFirebaseAuthUser) {
        // If they have a password set in the custom database profile, we must verify it!
        if (userProfile.password !== undefined && userProfile.password !== '') {
          if (currentPassword !== userProfile.password) {
            setError('Netačna trenutna lozinka.');
            setLoading(false);
            return;
          }
        }
        // Note: If userProfile.password is undefined or empty, we allow initializing it because they didn't have one before.

        // Update the password in Firestore users
        const userDocRef = doc(db, 'users', userProfile.uid);
        await setDoc(userDocRef, {
          ...userProfile,
          password: newPassword
        });
        updatedInFirestore = true;
      }

      if (!updatedInFirestore) {
        setError('Došlo je do greške prilikom čuvanja lozinke u bazi.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Lozinka je uspešno promenjena!');
      showToast('Lozinka je uspešno promenjena.', 'success');
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1500);

    } catch (err: any) {
      console.error('Password change error:', err);
      let localizedError = 'Došlo je do greške prilikom promene lozinke.';
      if (err.code === 'auth/wrong-password') {
        localizedError = 'Netačna trenutna lozinka.';
      } else if (err.code === 'auth/weak-password') {
        localizedError = 'Nova lozinka je suviše slaba.';
      } else if (err.message) {
        localizedError = err.message;
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        {/* Header decoration */}
        <div className="h-1.5 bg-indigo-600" />

        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-serif font-black italic uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
              Promena lozinke
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Unesite trenutnu i novu lozinku za Vaš nalog
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Trenutna lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Nova lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="najmanje 6 karaktera"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Potvrdi novu lozinku
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 dark:focus:ring-white dark:focus:border-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 font-mono font-bold text-xs uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading && <Loader className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Čuvanje...' : 'Promeni lozinku'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
