import React, { useState, useEffect } from 'react';
import { db, auth, firebaseConfig, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { UserProfile, SHOWS, ShowId, UserRole } from '../types';
import { Plus, Trash2, Edit3, ShieldAlert, Key, UserPlus, X, Check, Eye, EyeOff, RotateCcw, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditorManagementProps {
  onClose: () => void;
}

export default function EditorManagement({ onClose }: EditorManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields for creation/edit
  const [isEditing, setIsEditing] = useState<string | null>(null); // UID of user if editing, "new" for adding new user
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [assignedShow, setAssignedShow] = useState<ShowId | 'all'>(ShowId.PRVE_INFO);
  const [assignedShows, setAssignedShows] = useState<ShowId[]>([]);
  const [role, setRole] = useState<UserRole>('editor');
  const [actionLoading, setActionLoading] = useState(false);

  // Custom confirmation / alert states to bypass iframe-blocking window.confirm/alert
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Subscribe to users collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      // Sort users: admins first, then by name
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading users database:", err);
      setError("Došlo je do greške u učitavanju baze urednika.");
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    return () => unsub();
  }, []);

  // Prepares the form to edit an existing user
  const handleStartEdit = (user: UserProfile) => {
    setIsEditing(user.uid);
    setEmail(user.email);
    setDisplayName(user.displayName);
    setAssignedShow(user.assignedShow);
    if (user.assignedShows && Array.isArray(user.assignedShows)) {
      setAssignedShows(user.assignedShows);
    } else {
      setAssignedShows(user.assignedShow && user.assignedShow !== 'all' ? [user.assignedShow as ShowId] : [ShowId.PRVE_INFO]);
    }
    setRole(user.role);
    setPassword('');
    setError('');
    setSuccess('');
  };

  // Prepares the form to add a new user
  const handleStartNew = () => {
    setIsEditing('new');
    setEmail('');
    setDisplayName('');
    setAssignedShow(ShowId.PRVE_INFO);
    setAssignedShows([]);
    setRole('editor');
    setPassword('');
    setError('');
    setSuccess('');
  };

  // Clears the form and closes edit panel
  const handleCancel = () => {
    setIsEditing(null);
    setError('');
    setSuccess('');
  };

  // Safe Firebase Auth secondary setup for editor creation
  const createAuthUserSecondaryApp = async (emailStr: string, passwordStr: string): Promise<string> => {
    const uniqueAppName = `editor-provisioner-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, uniqueAppName);
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailStr, passwordStr);
      return cred.user.uid;
    } finally {
      // Free connections immediately
      await deleteApp(secondaryApp);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      if (role === 'editor' && (!assignedShows || assignedShows.length === 0)) {
        throw new Error('Morate dodeliti minimum jednu emisiju uredniku.');
      }

      if (isEditing === 'new') {
        // Validation checks
        if (!displayName.trim()) throw new Error('Unesite ime i prezime urednika.');
        if (!email.trim()) throw new Error('Unesite ispravnu e-mail adresu.');
        if (!password || password.length < 6) throw new Error('Lozinka mora imati najmanje 6 karaktera.');

        // 1. Double check email uniqueness in current loaded users
        const exists = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (exists) {
          throw new Error('Korisnik sa ovom e-mail adresom već postoji u aktivnoj bazi.');
        }

        // 2. Generate custom unique UID for credentials stored directly in Firestore
        const uid = 'editor_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

        // 3. Write UserProfile to Firestore users collection
        const profile: UserProfile = {
          uid,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim(),
          role,
          assignedShow: (role === 'admin' || role === 'viewer' || role === 'journalist') ? 'all' : (assignedShows[0] || ShowId.PRVE_INFO),
          assignedShows: (role === 'admin' || role === 'viewer' || role === 'journalist') ? Object.values(ShowId) : assignedShows,
          password,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, 'users', uid), profile);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${uid}`);
        }
        setSuccess(`Nalog za korisnika "${displayName}" je uspešno kreiran.`);
        setIsEditing(null);
      } else if (isEditing) {
        // Saving edits for existing profile
        if (!displayName.trim()) throw new Error('Ime i prezime ne može biti prazno.');
        
        // Update Firestore profile doc
        const existingUser = users.find(u => u.uid === isEditing);
        if (!existingUser) throw new Error('Korisnik nije pronađen.');

        const updatedProfile: UserProfile = {
          ...existingUser,
          displayName: displayName.trim(),
          role,
          assignedShow: (role === 'admin' || role === 'viewer' || role === 'journalist') ? 'all' : (assignedShows[0] || ShowId.PRVE_INFO),
          assignedShows: (role === 'admin' || role === 'viewer' || role === 'journalist') ? Object.values(ShowId) : assignedShows,
        };

        try {
          await setDoc(doc(db, 'users', isEditing), updatedProfile);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.UPDATE, `users/${isEditing}`);
        }
        setSuccess(`Izmene za urednika "${displayName}" su uspešno sačuvane.`);
        setIsEditing(null);
      }
    } catch (err: any) {
      console.error("User administration action error:", err);
      let errMsg = err.message || 'Došlo je do neočekivane greške.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = `E-mail adresa "${email}" je već u upotrebi u sistemu.`;
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Uneli ste netačan format e-mail adrese.';
      }
      setError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Prepares the user for custom state deletion instead of window.confirm
  const handleDeleteUser = (user: UserProfile) => {
    // Cannot delete active admin predefined session
    if (user.uid === 'admin_predefined') {
      setAlertMessage('Sistemski predefinisan administratorski nalog se ne može brisati.');
      return;
    }
    setDeleteConfirmUser(user);
  };

  // Performs the actual deletion from Firestore when confirmed in custom UI
  const handleExecuteDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    const userToDel = deleteConfirmUser;
    setDeleteConfirmUser(null);
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      try {
        await deleteDoc(doc(db, 'users', userToDel.uid));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `users/${userToDel.uid}`);
      }
      setSuccess(`Urednik "${userToDel.displayName}" je uspešno i u potpunosti obrisan.`);
    } catch (err: any) {
      console.error("Error deleting user document:", err);
      setError(err.message || 'Došlo je do greške prilikom brisanja naloga.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh]"
      >
        {/* Red Decorative Indicator Top bar */}
        <div className="h-1.5 bg-red-600" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-black italic uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
              Administracija Uredničkih Naloga
            </h3>
            <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
              Centralizovano upravljanje pristupom i uređivačkim sektorima
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-6 pt-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3 p-3 rounded bg-red-50 text-red-700 dark:bg-red-950/35 dark:text-red-300 border border-red-100 dark:border-red-900/40 text-xs flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3 p-3 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 text-xs flex items-center gap-2"
              >
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Body split in two if adding/editing */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Main List of Registered Users */}
          <div className="flex-1 space-y-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Aktivni Urednici ({users.length})
              </span>
              
              {isEditing !== 'new' && (
                <button
                  onClick={handleStartNew}
                  className="px-3 py-1 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider rounded flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novi Nalog</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-10 text-center text-zinc-400 text-xs font-semibold animate-pulse">
                Učitavanje spiska privilegovanih korisnika...
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/20">
                {users.map((user) => {
                  const showCfg = user.assignedShow !== 'all' ? SHOWS[user.assignedShow as ShowId] : null;
                  return (
                    <div 
                      key={user.uid}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-serif font-black text-sm text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                            {user.displayName}
                          </span>
                          
                          {user.role === 'admin' ? (
                            <span className="text-[8px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 px-1 py-0.5 rounded uppercase">
                              Superurednik
                            </span>
                          ) : user.role === 'viewer' ? (
                            <span className="text-[8px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400 px-1 py-0.5 rounded uppercase font-bold">
                              Gledalac
                            </span>
                          ) : user.role === 'journalist' ? (
                            <span className="text-[8px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 px-1 py-0.5 rounded uppercase font-bold">
                              Novinar
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 px-1 py-0.5 rounded uppercase">
                              Urednik
                            </span>
                          )}
                        </div>
                        
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">{user.email}</p>
                        
                        {/* Assigned Show badges */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Sektori:</span>
                          {user.role === 'admin' || user.assignedShow === 'all' ? (
                            <span className="text-[9px] font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-1.5 py-0.5 select-none rounded">
                              Sve emisije (Centralni)
                            </span>
                          ) : user.assignedShows && Array.isArray(user.assignedShows) && user.assignedShows.length > 0 ? (
                            user.assignedShows.map((showId) => {
                              const showCfg = SHOWS[showId];
                              if (!showCfg) return null;
                              return (
                                <span key={showId} className={`text-[9px] font-bold px-1.5 py-0.5 select-none rounded ${showCfg.badgeClass}`}>
                                  {showCfg.name}
                                </span>
                              );
                            })
                          ) : showCfg ? (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 select-none rounded ${showCfg.badgeClass}`}>
                              {showCfg.name}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-zinc-400 text-white px-1.5 py-0.5 select-none rounded">
                              Nije dodeljeno
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Operations */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(user)}
                          title="Izmeni prodajni ili uređivački status"
                          className="p-1 px-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        
                        {user.uid !== 'admin_predefined' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            title="Obriši urednika"
                            className="p-1 px-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-red-400 text-zinc-450 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit/Create Form sidebar drawer context */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full lg:w-80 shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 p-5 rounded-lg h-fit space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{isEditing === 'new' ? 'Novi Urednik' : 'Izmena Urednika'}</span>
                  </h4>
                  <button
                    onClick={handleCancel}
                    className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {/* Ime i Prezime */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 label-required">
                      Ime i Prezime
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="npr. Jovana Jovanović"
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white"
                    />
                  </div>

                  {/* E-mail (Only editable if creating new account) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 label-required">
                      Službeni E-mail
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isEditing !== 'new'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ime.prezime@tvstanica.com"
                      className={`w-full px-3 py-2 border text-xs rounded focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white ${
                        isEditing === 'new'
                          ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Password (Only required and shown when creating new user) */}
                  {isEditing === 'new' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 label-required">
                        Inicijalna Lozinka
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 karaktera"
                          className="w-full pl-3 pr-9 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-800"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* User Role */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      Uloga na platformi
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-770 text-zinc-900 dark:text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    >
                      <option value="editor">Urednik (Uobičajen)</option>
                      <option value="viewer">Gledalac (Samo pregled i pretraga)</option>
                      <option value="journalist">Novinar (Radni listovi)</option>
                      <option value="admin">Superurednik (Administrator)</option>
                    </select>
                  </div>

                  {/* Assigned Sector (Disabled if Role is Admin/Superurednik or Viewer) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Dodeljene Emisije (Sektor rada)
                    </label>
                    {role === 'admin' ? (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 rounded text-xs select-none">
                        ✨ <span className="font-semibold text-zinc-800 dark:text-zinc-200">Sve emisije</span> su predefinisano dodeljene za administrativnu ulogu.
                      </div>
                    ) : role === 'viewer' ? (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-850 text-sky-750 dark:text-sky-400 rounded text-xs select-none">
                        👁️ <span className="font-semibold text-sky-850 dark:text-sky-300">Sve emisije (Samo pregled)</span> su dostupne za ulogu gledaoca.
                      </div>
                    ) : role === 'journalist' ? (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-850 text-indigo-750 dark:text-indigo-400 rounded text-xs select-none">
                        📝 <span className="font-semibold text-indigo-850 dark:text-indigo-300">Radni listovi</span> su isključiva namena novinarske uloge.
                      </div>
                    ) : (
                      <div className="p-2 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950/30 rounded max-h-[160px] overflow-y-auto space-y-1">
                        {Object.values(SHOWS).map((show) => {
                          const isChecked = assignedShows.includes(show.id);
                          return (
                            <label
                              key={show.id}
                              className="flex items-center gap-2 p-1 px-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer select-none text-[11px] font-medium transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    if (assignedShows.length > 1) {
                                      setAssignedShows(assignedShows.filter(id => id !== show.id));
                                    }
                                  } else {
                                    setAssignedShows([...assignedShows, show.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                              />
                              <span className={isChecked ? "text-zinc-950 dark:text-zinc-50 font-bold" : "text-zinc-500 dark:text-zinc-400"}>
                                {show.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-mono font-bold text-[10px] uppercase tracking-wider text-zinc-500 rounded transition-colors cursor-pointer text-center"
                    >
                      Otkaži
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-mono font-bold text-[10px] uppercase tracking-wider text-center rounded hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? 'SLANJE...' : 'SAČUVAJ'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      {/* Custom user deletion confirmation modal */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-left"
            >
              <div className="p-5">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 font-serif uppercase tracking-tight">
                  Uklanjanje Urednika
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans font-normal">
                  Da li ste sigurni da želite da obrišete i skroz uklonite urednika <strong className="text-zinc-900 dark:text-zinc-100 font-bold">"{deleteConfirmUser.displayName}"</strong>? 
                  <br /><br />
                  Korisnikov nalog i pristup centralnom registru biće kompletno i trajno obrisani iz baze. Ova akcija se ne može poništiti.
                </p>
                <div className="mt-5 flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteConfirmUser(null)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Odustani
                  </button>
                  <button
                    onClick={handleExecuteDeleteUser}
                    className="px-3 py-1.5 rounded-lg bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Obriši nalog
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom alert system */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-left"
            >
              <div className="p-5">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 font-serif uppercase tracking-tight flex items-center gap-1.5 text-red-600">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Sistemska Greška</span>
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans font-normal">
                  {alertMessage}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setAlertMessage(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 text-[10px] font-bold uppercase cursor-pointer"
                  >
                    U redu
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
