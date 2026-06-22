import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { 
  ShowId, 
  SHOWS, 
  UserProfile, 
  Guest, 
  GuestConfirmationStatus, 
  GUEST_STATUS_MAP 
} from './types';
import AuthModal from './components/AuthModal';
import GuestFormModal from './components/GuestFormModal';
import StatsSection from './components/StatsSection';
import EditorManagement from './components/EditorManagement';
import ChangePasswordModal from './components/ChangePasswordModal';
import { 
  Tv, 
  LogIn, 
  LogOut, 
  User, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Key, 
  Edit2, 
  Trash2, 
  Lock, 
  FileSpreadsheet, 
  AlertCircle,
  Clock, 
  Calendar,
  Phone,
  ShieldCheck,
  Check,
  CalendarDays,
  Sun,
  ListFilter,
  Menu,
  X,
  Sparkles,
  Car,
  MapPin
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditorMgmtOpen, setIsEditorMgmtOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Guests data and grid states
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShowFilter, setSelectedShowFilter] = useState<ShowId | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<GuestConfirmationStatus | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');

  // Real-time local clock
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Update clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('sr-RS', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Custom dialogs/alerts states to replace browser window.confirm and alert in iframe environments
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Automatically dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4005);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Listen to Auth State
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    
    // Check if there is an active custom localStorage session
    const cachedAdmin = localStorage.getItem('predefined_admin_session');
    const cachedEditor = localStorage.getItem('editor_session');
    
    if (cachedAdmin) {
      try {
        const adminProfile = JSON.parse(cachedAdmin) as UserProfile;
        setCurrentUser({ uid: 'admin_predefined', email: adminProfile.email, isPredefinedAdmin: true });
        setUserProfile(adminProfile);
        setAuthLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('predefined_admin_session');
      }
    } else if (cachedEditor) {
      try {
        const editorProfile = JSON.parse(cachedEditor) as UserProfile;
        setCurrentUser({ uid: editorProfile.uid, email: editorProfile.email });
        setUserProfile(editorProfile);
        setAuthLoading(false);
        
        // Also subscribe real-time to their document in Firestore to fetch any live edits (e.g. show reassignment)
        const userDocRef = doc(db, 'users', editorProfile.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            setUserProfile(profileData);
            localStorage.setItem('editor_session', JSON.stringify(profileData));
          } else {
            // Profile has been deleted! Sign them out immediately
            setCurrentUser(null);
            setUserProfile(null);
            localStorage.removeItem('editor_session');
            setNotification({ type: 'error', message: 'Vaš nalog je uklonjen iz baze.' });
          }
        }, (error) => {
          console.error("Firestore user profile live listener error:", error);
          handleFirestoreError(error, OperationType.GET, `users/${editorProfile.uid}`);
        });
        
        return () => {
          if (unsubscribeProfile) unsubscribeProfile();
        };
      } catch (e) {
        localStorage.removeItem('editor_session');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (user) {
        setCurrentUser(user);
        // Get user profile on change
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            if (profileData.isDeleted) {
              setUserProfile(null);
              setCurrentUser(null);
              signOut(auth);
              setNotification({ type: 'error', message: 'Vaš nalog je deaktiviran od strane administratora.' });
            } else {
              setUserProfile(profileData);
            }
          } else {
            // Fallback profile and auto-saving to database so they can be managed!
            const fallbackProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Urednik',
              role: 'editor',
              assignedShow: ShowId.PRVE_INFO,
              assignedShows: [ShowId.PRVE_INFO],
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, fallbackProfile);
            } catch (e) {
              console.error("Greška pri kreiranju fallback profila u Firestore:", e);
            }
            setUserProfile(fallbackProfile);
          }
          setAuthLoading(false);
        }, (error) => {
          console.error("Firestore user profile snapshot error:", error);
          setAuthLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Set real-time Firestore load
  useEffect(() => {
    if (!currentUser) {
      setGuests([]);
      setGuestsLoading(false);
      return;
    }
    const guestsCol = collection(db, 'guests');
    const q = query(guestsCol, orderBy('appointmentDate', 'asc'), orderBy('appointmentTime', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Guest[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Guest);
      });
      setGuests(data);
      setGuestsLoading(false);
    }, (error) => {
      console.error("Firestore snapshot loaded error:", error);
      setGuestsLoading(false);
      handleFirestoreError(error, OperationType.GET, 'guests');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Log out helper
  const handleLogout = async () => {
    localStorage.removeItem('predefined_admin_session');
    localStorage.removeItem('editor_session');
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    showToast('Uspešno ste se odjavili sa sistema.', 'success');
  };

  // Add or Edit Guest DB helper
  const handleSaveGuest = async (guestData: Omit<Guest, 'id'> & { id?: string }) => {
    const docId = guestData.id || `guest_${Date.now()}`;
    try {
      await setDoc(doc(db, 'guests', docId), guestData);
      showToast(guestData.id ? 'Izmene su uspešno sačuvane.' : 'Novi gost je uspesno dodat.', 'success');
    } catch (err) {
      console.error("Problem saving guest document:", err);
      showToast('Greška pri čuvanju gosta.', 'error');
      handleFirestoreError(err, guestData.id ? OperationType.UPDATE : OperationType.CREATE, `guests/${docId}`);
    }
  };

  // Delete Guest DB helper
  const handleDeleteGuest = (guestId: string, guestName: string) => {
    setDeleteConfirmation({ id: guestId, name: guestName });
  };

  const confirmDeleteGuest = async () => {
    if (!deleteConfirmation) return;
    try {
      await deleteDoc(doc(db, 'guests', deleteConfirmation.id));
      showToast('Gost je uspešno obrisan.', 'success');
    } catch (err) {
      console.error("Error deleting guest:", err);
      showToast('Došlo je do greške prilikom brisanja gosta.', 'error');
      handleFirestoreError(err, OperationType.DELETE, `guests/${deleteConfirmation.id}`);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // Clear all guests helper
  const handleClearAllGuests = async () => {
    if (!clearAllConfirm) {
      setClearAllConfirm(true);
      setTimeout(() => setClearAllConfirm(false), 3000);
      return;
    }
    try {
      let deletedCount = 0;
      for (const guest of guests) {
        await deleteDoc(doc(db, 'guests', guest.id));
        deletedCount++;
      }
      showToast(`Uspešno je obrisano ${deletedCount} test gostiju.`, 'success');
      setClearAllConfirm(false);
    } catch (err) {
      console.error("Error clearing guests:", err);
      showToast('Greška pri brisanju gostiju.', 'error');
      setClearAllConfirm(false);
    }
  };

  // Inline status quick-changer
  const handleInlineStatusChange = async (guest: Guest, newStatus: GuestConfirmationStatus) => {
    if (!canEditGuest(guest)) return;
    try {
      const updated: Guest = {
        ...guest,
        status: newStatus,
        updatedByUid: userProfile?.uid,
        updatedByEmail: userProfile?.email,
        updatedByName: userProfile?.displayName,
        updatedAt: new Date().toISOString()
      };
      const { id, ...saveData } = updated;
      await setDoc(doc(db, 'guests', guest.id), saveData);
      showToast(`Status gosta je promenjen na: ${GUEST_STATUS_MAP[newStatus]?.label}`, 'success');
    } catch (err) {
      console.error("Error updating inline status:", err);
      showToast('Nemate dozvolu ili je došlo do greške prilikom promene statusa.', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `guests/${guest.id}`);
    }
  };

  // Access rights evaluator helper
  const canEditGuest = (guest: Guest): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'viewer') return false;
    if (userProfile.role === 'admin' || userProfile.assignedShow === 'all') return true;
    if (userProfile.assignedShows && Array.isArray(userProfile.assignedShows)) {
      if (userProfile.assignedShows.includes(guest.showId)) return true;
    }
    return userProfile.assignedShow === guest.showId;
  };

  // Export filtered list to Sheets-compatible format (CSV UTF-16LE with tab separator to render perfectly in Excel in any locale with no character errors)
  const handleExportCSV = () => {
    if (filteredGuests.length === 0) {
      showToast('Nema podataka za preuzimanje sa trenutnim filtriranjem.', 'info');
      return;
    }

    const headers = ['Emisija', 'Datum gostovanja', 'Vreme gostovanja', 'Gost (Ime i prezime)', 'Funkcija / Zanimanje', 'Tema razgovora', 'Kontakt telefon', 'Status dolaska', 'Napomene i logistika', 'Zabeležio urednik', 'Datum unosa u sistem'];
    const rows = filteredGuests.map(g => {
      const showName = SHOWS[g.showId]?.name || g.showId;
      const statusLabel = GUEST_STATUS_MAP[g.status]?.label || g.status;
      const appointmentDateFormatted = new Date(g.appointmentDate).toLocaleDateString('sr-RS');
      const createdAtFormatted = new Date(g.createdAt).toLocaleDateString('sr-RS') + ' ' + new Date(g.createdAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

      // Clean notes to avoid breaking rows
      const cleanNotes = (g.notes || '').replace(/\r?\n|\r|\t/g, " ").replace(/"/g, '""');
      const cleanFullName = (g.fullName || '').replace(/\t/g, " ").replace(/"/g, '""');
      const cleanOccupation = (g.occupation || '').replace(/\t/g, " ").replace(/"/g, '""');
      const cleanTopic = (g.topic || '').replace(/\t/g, " ").replace(/"/g, '""');
      const cleanPhone = (g.contactPhone || '').replace(/\t/g, " ").replace(/"/g, '""');
      const cleanEditor = (g.createdByName || '').replace(/\t/g, " ").replace(/"/g, '""');

      return [
        `"${showName}"`,
        `"${appointmentDateFormatted}"`,
        `"${g.appointmentTime || '10:00'}"`,
        `"${cleanFullName}"`,
        `"${cleanOccupation}"`,
        `"${cleanTopic}"`,
        `"${cleanPhone}"`,
        `"${statusLabel}"`,
        `"${cleanNotes}"`,
        `"${cleanEditor}"`,
        `"${createdAtFormatted}"`
      ];
    });

    const tsvContent = [
      headers.map(h => `"${h}"`).join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\r\n');

    // Create a UTF-16LE buffer with Byte Order Mark (0xFEFF)
    const buffer = new ArrayBuffer(tsvContent.length * 2 + 2);
    const view = new DataView(buffer);
    view.setUint16(0, 0xFEFF, true); // UTF-16LE BOM
    for (let i = 0; i < tsvContent.length; i++) {
      view.setUint16((i + 1) * 2, tsvContent.charCodeAt(i), true);
    }

    const blob = new Blob([buffer], { type: 'text/csv;charset=utf-16le;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Plan_Gostovanja_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Advanced client-side filtering logic
  const filteredGuests = guests.filter((guest) => {
    // 1. Search Query mapping
    const searchString = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchString || 
      guest.fullName.toLowerCase().includes(searchString) ||
      guest.occupation.toLowerCase().includes(searchString) ||
      guest.topic.toLowerCase().includes(searchString) ||
      guest.notes.toLowerCase().includes(searchString) ||
      guest.contactPhone.toLowerCase().includes(searchString);

    // 2. Show pill filter
    const matchesShow = selectedShowFilter === 'all' || guest.showId === selectedShowFilter;

    // 3. Status select filter
    const matchesStatus = selectedStatusFilter === 'all' || guest.status === selectedStatusFilter;

    // 4. Appointment range filter (today, tomorrow, this week)
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      if (timeFilter === 'today') {
        matchesTime = guest.appointmentDate === todayStr;
      } else if (timeFilter === 'tomorrow') {
        matchesTime = guest.appointmentDate === tomorrowStr;
      } else if (timeFilter === 'week') {
        const todayVal = new Date();
        const endOfWeek = new Date();
        endOfWeek.setDate(todayVal.getDate() + 7);
        
        const guestDateVal = new Date(guest.appointmentDate);
        // Compare values ignoring time offsets
        const start = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate());
        const end = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate());
        matchesTime = guestDateVal >= start && guestDateVal <= end;
      }
    }

    return matchesSearch && matchesShow && matchesStatus && matchesTime;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-mono text-zinc-500 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-800 dark:border-t-zinc-200 rounded-full animate-spin" />
          <span>Učitavanje...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-sm shrink-0">UŽIVO</span>
              <h1 className="text-2xl font-serif font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">Gostionica</h1>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">Centralni Registar Gostiju</p>
          </div>
          <AuthModal
            isOpen={true}
            onClose={() => {}}
            onAuthSuccess={(profile) => {
              setUserProfile(profile);
              if (profile.uid === 'admin_predefined') {
                setCurrentUser({ uid: 'admin_predefined', email: profile.email, isPredefinedAdmin: true });
              } else {
                setCurrentUser({ uid: profile.uid, email: profile.email });
              }
            }}
            isForceAuth={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 antialiased flex flex-col md:flex-row transition-colors duration-300 select-none">
      
      {/* Mobile Sticky top bar */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between md:hidden shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[8px] uppercase font-mono font-bold tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded-sm shrink-0">UŽIVO</span>
          <h1 className="text-lg font-serif font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">Gostionica</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Studijski sat widget on mobile header */}
          <div className="text-right mr-1">
            <div className="text-xs font-mono font-bold text-red-600 dark:text-red-500 tracking-wider">{timeStr}</div>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-205 cursor-pointer transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Backdrop for mobile active sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-xs z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. EDITORIAL SIDEBAR for Desktop or Collapsed Drawer for Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between transform transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:flex shrink-0 h-full md:h-auto`}>
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Newsroom Brand Section */}
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[9px] uppercase font-mono font-bold tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-sm shrink-0">UŽIVO</span>
                <h1 className="text-xl font-serif font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">Gostionica</h1>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">Centralni Registar Gostiju</p>
            </div>
 
            {/* Synchronized Studio Clock inside Sidebar */}
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Studijski sat (UTC +1)</p>
              <div className="text-lg font-mono font-bold text-red-600 dark:text-red-500 tracking-wider mt-0.5">{timeStr}</div>
              <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mt-1">{dateStr}</div>
            </div>
          </div>
 
          {/* Categories navigation mapping inside Sidebar (TV Shows list) */}
          <div className="py-4 px-3 overflow-y-auto space-y-1 hierarchy-shows">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 px-3 mb-2">UREĐIVAČKI SEKTORI</p>
            <button
              onClick={() => {
                setSelectedShowFilter('all');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-1.5 rounded-md flex items-center justify-between text-left transition-all cursor-pointer ${
                selectedShowFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium'
              }`}
            >
              <span className="text-xs uppercase tracking-wider font-semibold">Sve Emisije</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${selectedShowFilter === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>{guests.length}</span>
            </button>
            
            {Object.values(SHOWS).map((show) => {
              const count = guests.filter((g) => g.showId === show.id).length;
              const isSelected = selectedShowFilter === show.id;
              return (
                <button
                  key={show.id}
                  onClick={() => {
                    setSelectedShowFilter(show.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 rounded-md flex items-center justify-between text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${show.badgeClass} ring-1 ring-zinc-900/10 dark:ring-white/20 font-bold shadow-sm`
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-semibold'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight truncate">{show.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ml-1 px-1.5 py-0.5 rounded-xs ${isSelected ? 'bg-zinc-900/20 text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
 
        {/* User Session profile details anchored securely at the footer of Sidebar */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          {authLoading ? (
            <span className="text-[10px] font-mono text-zinc-400 animate-pulse uppercase tracking-wider">Skeniranje baze...</span>
          ) : currentUser && userProfile ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-sm select-none border border-zinc-200 dark:border-zinc-800">
                  {userProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-950 dark:text-zinc-100 truncate leading-none">{userProfile.displayName}</p>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-1 truncate">
                    {userProfile.role === 'admin' ? 'Superurednik' : userProfile.role === 'viewer' ? 'Online • Gledalac' : 'Online • Urednik'}
                  </p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 text-[9px] font-medium leading-normal">
                <span className="text-zinc-500 uppercase font-bold block mb-0.5">Dodeljen sektor:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                  {userProfile.role === 'viewer' ? (
                    'Sve emisije (Pregled)'
                  ) : userProfile.role === 'admin' || userProfile.assignedShow === 'all' ? (
                    'Sve emisije'
                  ) : userProfile.assignedShows && Array.isArray(userProfile.assignedShows) && userProfile.assignedShows.length > 0 ? (
                    userProfile.assignedShows.map(id => SHOWS[id]?.name || id).join(', ')
                  ) : (
                    SHOWS[userProfile.assignedShow]?.name || 'Nije dodeljeno'
                  )}
                </span>
              </div>

              {userProfile.role === 'admin' && (
                <button
                  onClick={() => setIsEditorMgmtOpen(true)}
                  className="w-full text-center py-1.5 mb-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  Urednici
                </button>
              )}

              {currentUser && (
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="w-full text-center py-1.5 mb-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-805 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border border-zinc-200 dark:border-zinc-800/60"
                >
                  <Key className="w-3.5 h-3.5" />
                  Promeni lozinku
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-center py-1 border border-zinc-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-950/40 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/25 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
              >
                Odjavi se
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase leading-snug">
                Pregled ranga kao posmatrač
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-1.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-mono font-bold text-[10px] uppercase tracking-widest rounded transition-all active:scale-95 cursor-pointer"
              >
                Prijavi se
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col p-4 md:p-8 space-y-6">
        
        {/* Workspace Title & Actions Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-widest">Aktivni Desk</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h2 className="text-3xl font-serif font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white mt-1">
              {selectedShowFilter === 'all' ? 'SVE EMISIJE' : SHOWS[selectedShowFilter]?.name}
            </h2>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* Download CSV */}
            <button
              onClick={handleExportCSV}
              className="p-2.5 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 bg-white dark:bg-zinc-900 cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>Izvezi CSV</span>
            </button>

            {/* Add Guest Entry - Locked if not registered or if viewer role */}
            {currentUser && userProfile?.role !== 'viewer' ? (
              <button
                onClick={() => {
                  setSelectedGuest(null);
                  setIsGuestModalOpen(true);
                }}
                className="p-2.5 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-mono font-bold uppercase tracking-widest rounded transition-all flex items-center gap-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-100 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Upiši gosta</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser) setIsAuthModalOpen(true);
                }}
                className={`p-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest rounded transition-all flex items-center gap-1.5 border border-dashed border-zinc-300 dark:border-zinc-750 ${
                  !currentUser ? 'cursor-not-allowed' : 'opacity-70 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Upiši gosta</span>
              </button>
            )}
          </div>
        </div>

        {/* Warning card for viewer */}
        <AnimatePresence>
          {(!currentUser || userProfile?.role === 'viewer') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    {userProfile?.role === 'viewer' ? (
                      <span><strong>Režim gledaoca:</strong> Prijavljeni ste sa nalogom za pregled i pretragu. Nemate mogućnost unosa ili izmene podataka.</span>
                    ) : (
                      <span><strong>Režim posmatrača:</strong> Možete pregledati sve unose. Prijavite se kako biste mogli da uređujete rasporede emisija.</span>
                    )}
                  </span>
                </div>
                {!currentUser && (
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-3 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Prijavi se odmah
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Analytics & Statistics Widget */}
        <StatsSection guests={guests} />

        {/* Dashboard Grid Actions, Filters and Sheets Sheet Structure */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          
          {/* Top Sheet Toolbar (Filters & Search) */}
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/60 space-y-3">
            
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              
              {/* Left search bar */}
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pretraži listu gosta, funkciju ili temu razgovora..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs placeholder:text-zinc-400 font-medium"
                />
              </div>

              {/* Quick Status / Date filters combo */}
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Status selection widget */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status dolaska:</span>
                  <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-0.5 rounded">
                    <button
                      onClick={() => setSelectedStatusFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        selectedStatusFilter === 'all'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-700'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Svi
                    </button>
                    {Object.entries(GUEST_STATUS_MAP).map(([statusKey, val]) => (
                      <button
                        key={statusKey}
                        onClick={() => setSelectedStatusFilter(statusKey as GuestConfirmationStatus)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          selectedStatusFilter === statusKey
                            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
                            : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Date limits Filters */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Prikaži za:</span>
                  <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-0.5 rounded">
                    <button
                      onClick={() => setTimeFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        timeFilter === 'all'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-700'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Sve
                    </button>
                    <button
                      onClick={() => setTimeFilter('today')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        timeFilter === 'today'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-450'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Danas
                    </button>
                    <button
                      onClick={() => setTimeFilter('tomorrow')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        timeFilter === 'tomorrow'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Sutra
                    </button>
                    <button
                      onClick={() => setTimeFilter('week')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        timeFilter === 'week'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      7 dana
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Direct Multi-pills filtering block - Visible on Mobile as quick tabs */}
            <div className="flex md:hidden flex-col gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">TV EMISIJE:</div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedShowFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
                    selectedShowFilter === 'all'
                      ? 'bg-zinc-900 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  Sve ({guests.length})
                </button>
                {Object.values(SHOWS).map((show) => {
                  const count = guests.filter(g => g.showId === show.id).length;
                  return (
                    <button
                      key={show.id}
                      onClick={() => setSelectedShowFilter(show.id)}
                      className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
                        selectedShowFilter === show.id
                          ? `${show.badgeClass} border-transparent font-bold`
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {show.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Sheet main data view (Responsive Table / Mobile List) */}
          <div className="w-full">
            {guestsLoading ? (
              <div className="p-12 text-center text-zinc-400">
                <div className="relative inline-block w-8 h-8 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 animate-spin mb-3"></div>
                <p className="text-sm font-semibold">Osvežavanje unosa u realnom vremenu...</p>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-12 py-16 text-center max-w-md mx-auto">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h4 className="text-base font-serif font-black italic uppercase text-zinc-900 dark:text-white">Nema pronađenih gostovanja</h4>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 leading-relaxed">
                  Ne postoji podatak koji se poklapa sa zadatim parametrima filtriranja ili pretrage. Unesite drugačiji termin.
                </p>
                {searchQuery || selectedShowFilter !== 'all' || selectedStatusFilter !== 'all' || timeFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedShowFilter('all');
                      setSelectedStatusFilter('all');
                      setTimeFilter('all');
                    }}
                    className="mt-4 px-4 py-2 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                  >
                    Poništi filtere
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {/* Desktop view: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1050px]">
                    <thead>
                      <tr className="bg-zinc-100/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none text-[10px] font-mono font-bold uppercase tracking-widest leading-none">
                        <th className="px-5 py-4 text-center w-28">Status</th>
                        <th className="px-4 py-4 w-60">Gost / Zanimanje</th>
                        <th className="px-4 py-4">Tema razgovora</th>
                        <th className="px-4 py-4 w-40">Termin</th>
                        <th className="px-4 py-4 w-42 font-mono">Kontakt Telefon</th>
                        <th className="px-4 py-4 min-w-[150px] max-w-[250px]">Napomena</th>
                        <th className="px-4 py-4 w-40">Emisija</th>
                        <th className="px-4 py-4 w-36">Urednik</th>
                        <th className="px-5 py-4 text-center w-28">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {filteredGuests.map((guest, idx) => {
                        const writable = canEditGuest(guest);
                        const showCfg = SHOWS[guest.showId];
                        const statusCfg = GUEST_STATUS_MAP[guest.status];

                        return (
                          <tr 
                            key={guest.id} 
                            className={`hover:bg-zinc-50/75 dark:hover:bg-zinc-800/60 transition-colors ${
                              idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/40 dark:bg-zinc-950/30'
                            }`}
                          >
                            {/* Status Checkbox-style Toggle */}
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              {writable ? (
                                <select
                                  value={guest.status}
                                  onChange={(e) => handleInlineStatusChange(guest, e.target.value as GuestConfirmationStatus)}
                                  className={`p-1 px-1.5 font-bold rounded-lg ${statusCfg?.colorClass} ${statusCfg?.bgClass} uppercase text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                                >
                                  <option value="predlozen">📋 Predložen</option>
                                  <option value="na_cekanju">⏳ Čekanje</option>
                                  <option value="potvrdjen">✅ Potvrđen</option>
                                  <option value="otkazao">❌ Otkazao</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusCfg?.colorClass} ${statusCfg?.bgClass}`}>
                                  {statusCfg?.label}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {guest.fullName}
                              </div>
                              {guest.occupation ? (
                                <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 line-clamp-1" title={guest.occupation}>
                                  {guest.occupation}
                                </p>
                              ) : (
                                <p className="text-slate-350 dark:text-slate-600 text-[11px] italic mt-0.5">bez upisanog zanimanja</p>
                              )}
                              
                              {/* Logistics badges */}
                              {(guest.makeupStatus === 'da' || guest.transportStatus === 'da') && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {guest.makeupStatus === 'da' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded border border-pink-100 dark:border-pink-900/40 font-bold select-none" title="Potrebna šminka">
                                      <Sparkles className="w-3 h-3 text-pink-500 shrink-0" />
                                      Šminka
                                    </span>
                                  )}
                                  {guest.transportStatus === 'da' && (
                                    <span 
                                      className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 font-bold select-none cursor-help"
                                      title={`Adresa prevoza: ${guest.transportDetails || 'Nije prenesena'}`}
                                    >
                                      <Car className="w-3 h-3 text-indigo-500 shrink-0" />
                                      Prevoz
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {guest.topic ? (
                                <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2 max-w-[320px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg leading-relaxed" title={guest.topic}>
                                  {guest.topic}
                                </p>
                              ) : (
                                <span className="text-slate-350 dark:text-slate-600 italic">nije specificirano</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {new Date(guest.appointmentDate).toLocaleDateString('sr-RS', {
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mt-1 pl-5 text-[11px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{guest.appointmentTime} h</span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono">
                              {guest.contactPhone ? (
                                <a 
                                  href={`tel:${guest.contactPhone}`} 
                                  className="flex items-center gap-1.5 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{guest.contactPhone}</span>
                                </a>
                              ) : (
                                <span className="text-slate-350 dark:text-slate-600 italic">-</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 min-w-[150px] max-w-[250px]">
                              {guest.transportStatus === 'da' && guest.transportDetails && (
                                <div className="mb-2 p-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded text-[11px]">
                                  <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    Adresa prevoza:
                                  </span>
                                  <p className="text-zinc-650 dark:text-zinc-300 font-semibold italic select-all break-words">
                                    {guest.transportDetails}
                                  </p>
                                </div>
                              )}
                              {guest.notes ? (
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 md:max-w-[230px] leading-relaxed" title={guest.notes}>
                                  {guest.notes}
                                </p>
                              ) : (
                                !guest.transportDetails && <span className="text-slate-300 dark:text-slate-700">-</span>
                              )}
                              {guest.updatedByName && (
                                <span className="block text-[9px] text-slate-350 hover:text-slate-400 transition-colors mt-1 font-semibold">
                                  (Izmenio {guest.updatedByName})
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {showCfg ? (
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${showCfg.badgeClass}`}>
                                  {showCfg.name}
                                </span>
                              ) : (
                                <span className="text-slate-350 dark:text-slate-700 uppercase italic">Nepoznato</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                              <p className="font-semibold truncate max-w-[110px]" title={guest.createdByName}>
                                {guest.createdByName}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(guest.createdAt).toLocaleDateString('sr-RS', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </p>
                            </td>

                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              {writable ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedGuest(guest);
                                      setIsGuestModalOpen(true);
                                    }}
                                    title="Izmeni unose"
                                    className="p-1 px-1.5 rounded-lg text-slate-600 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors active:scale-90"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGuest(guest.id, guest.fullName)}
                                    title="Ukloni gosta"
                                    className="p-1 px-1.5 rounded-lg text-slate-600 hover:text-rose-650 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-90"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center" title="Samo urednik ove emisije može da menja podatke">
                                  <Lock className="w-3.5 h-3.5 text-slate-350 dark:text-slate-650" />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view: Card stack list */}
                <div className="block md:hidden divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {filteredGuests.map((guest) => {
                    const writable = canEditGuest(guest);
                    const showCfg = SHOWS[guest.showId];
                    const statusCfg = GUEST_STATUS_MAP[guest.status];
                    const guestDate = new Date(guest.appointmentDate);

                    return (
                      <div key={guest.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2.5">
                          {/* Name & Occupation */}
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">
                              {guest.fullName}
                            </h4>
                            {guest.occupation ? (
                              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5 leading-snug">
                                {guest.occupation}
                              </p>
                            ) : (
                              <p className="text-zinc-405 dark:text-zinc-600 text-xs italic mt-0.5">bez upisanog zanimanja</p>
                            )}

                            {/* Mobile logistics badges */}
                            {(guest.makeupStatus === 'da' || guest.transportStatus === 'da') && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {guest.makeupStatus === 'da' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded border border-pink-100 dark:border-pink-900/40 font-bold select-none">
                                    <Sparkles className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                                    Šminka ok
                                  </span>
                                )}
                                {guest.transportStatus === 'da' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 font-bold select-none">
                                    <Car className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                    Prevoz
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status select/indicator badge */}
                          <div>
                            {writable ? (
                              <select
                                value={guest.status}
                                onChange={(e) => handleInlineStatusChange(guest, e.target.value as GuestConfirmationStatus)}
                                className={`p-1 px-1.5 font-bold rounded-lg ${statusCfg?.colorClass} ${statusCfg?.bgClass} uppercase text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                              >
                                <option value="predlozen">📋 Predložen</option>
                                <option value="na_cekanju">⏳ Čekanje</option>
                                <option value="potvrdjen">✅ Potvrđen</option>
                                <option value="otkazao">❌ Otkazao</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusCfg?.colorClass} ${statusCfg?.bgClass}`}>
                                {statusCfg?.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Topic */}
                        <div className="bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tema razgovora</p>
                          {guest.topic ? (
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                              {guest.topic}
                            </p>
                          ) : (
                            <span className="text-zinc-350 dark:text-zinc-600 text-xs italic">Nije specificisano</span>
                          )}
                        </div>

                        {/* Details: Date/Time, Phone, Show, Editor */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400">Termin gostovanja</span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                              <CalendarDays className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>
                                {guestDate.toLocaleDateString('sr-RS', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                              <span className="text-zinc-400">•</span>
                              <span>{guest.appointmentTime} h</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400">Telefon</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {guest.contactPhone ? (
                                <a 
                                  href={`tel:${guest.contactPhone}`} 
                                  className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                                  {guest.contactPhone}
                                </a>
                              ) : (
                                <span className="text-zinc-350 dark:text-zinc-650 italic text-[11px]">-</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400">Emisija / Sektor</span>
                            <div className="mt-0.5">
                              {showCfg ? (
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${showCfg.badgeClass}`}>
                                  {showCfg.name}
                                </span>
                              ) : (
                                <span className="text-zinc-350 dark:text-zinc-650 italic text-[10px]">Nepoznato</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400">Urednik</span>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                              <p className="font-semibold leading-none text-zinc-700 dark:text-zinc-300">
                                {guest.createdByName}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5 leading-none">
                                {new Date(guest.createdAt).toLocaleDateString('sr-RS', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notes & Actions combined on 1 line if editable */}
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="min-w-0 w-full space-y-1">
                            {guest.transportStatus === 'da' && guest.transportDetails && (
                              <div className="text-[11px] p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded flex flex-col">
                                <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-500" />
                                  Prevoz adresa:
                                </span>
                                <span className="text-zinc-650 dark:text-zinc-300 font-semibold italic break-words mt-0.5 select-all">
                                  {guest.transportDetails}
                                </span>
                              </div>
                            )}
                            {guest.notes ? (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-bold text-zinc-400 dark:text-zinc-500">Napomena: </span>
                                {guest.notes}
                              </div>
                            ) : null}
                            {guest.updatedByName && (
                              <span className="block text-[9px] text-zinc-400 italic">
                                (Izmenio {guest.updatedByName})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 text-right shrink-0">
                            {writable ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedGuest(guest);
                                    setIsGuestModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Izmeni</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteGuest(guest.id, guest.fullName)}
                                  className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Ukloni</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500" title="Samo urednik ove emisije može da menja podatke">
                                <Lock className="w-3 h-3 text-zinc-300 dark:text-zinc-650" />
                                <span>Zaključano</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Table Footer Stats status message */}
          <div className="p-4 px-5 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-500 text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>
              Prikazano je {filteredGuests.length} od ukupno {guests.length} gostovanja u rasporedu televizije.
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Podaci se automatski ažuriraju u realnom vremenu
            </span>
          </div>

        </div>

      </main>

      {/* Floating Modals System */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={(profile) => {
              setUserProfile(profile);
              setIsAuthModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGuestModalOpen && currentUser && userProfile && (
          <GuestFormModal
            isOpen={isGuestModalOpen}
            onClose={() => {
              setIsGuestModalOpen(false);
              setSelectedGuest(null);
            }}
            onSave={handleSaveGuest}
            guest={selectedGuest}
            userProfile={userProfile}
            guests={guests}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditorMgmtOpen && currentUser && userProfile?.role === 'admin' && (
          <EditorManagement
            onClose={() => setIsEditorMgmtOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChangePasswordOpen && currentUser && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Custom Deletion Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-zinc-950/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 font-serif uppercase tracking-tight">Potvrda brisanja</h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                  Da li ste sigurni da želite da trajno obrišete gosta <strong className="text-zinc-900 dark:text-zinc-100 font-bold">"{deleteConfirmation.name}"</strong>? Ova akcija se ne može poništiti.
                </p>
                <div className="mt-5 flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Odustani
                  </button>
                  <button
                    onClick={confirmDeleteGuest}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Obriši
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-[11px] font-mono tracking-wide font-bold uppercase transition-all bg-white dark:bg-zinc-900 text-zinc-90 w-auto max-w-xs border-zinc-200 dark:border-zinc-800"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              notification.type === 'success' ? 'bg-emerald-500' :
              notification.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
            }`} />
            <span className="text-zinc-800 dark:text-zinc-200">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
