import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, WorkReport } from '../types';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  Key, 
  Clock, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Loader,
  RefreshCw
} from 'lucide-react';
import SubmitWorkReportModal from './SubmitWorkReportModal';
import ChangePasswordModal from './ChangePasswordModal';

interface JournalistDashboardProps {
  userProfile: UserProfile;
  hasSubmittedToday: boolean;
  handleLogout: () => void;
  timeStr: string;
  dateStr: string;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function JournalistDashboard({
  userProfile,
  hasSubmittedToday,
  handleLogout,
  timeStr,
  dateStr,
  showToast
}: JournalistDashboardProps) {
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  
  // History of reports
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Listen to past reports for this journalist
    const q = query(
      collection(db, 'work_reports'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: WorkReport[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as WorkReport);
      });
      // Sort client-side by date descending
      list.sort((a, b) => b.date.localeCompare(a.date));
      setReports(list);
      setLoadingReports(false);
    }, (err) => {
      console.error("Error loading journalist work reports:", err);
      setLoadingReports(false);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  const toggleExpand = (id: string) => {
    setExpandedReports(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 antialiased flex flex-col transition-colors duration-300">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="text-[8px] uppercase font-mono font-bold tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-sm shrink-0">PORTAL</span>
          <h1 className="text-xl font-serif font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">
            Gostionica <span className="text-indigo-600 dark:text-indigo-400">Novinari</span>
          </h1>
        </div>

        {/* User profile controls and logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{userProfile.displayName}</span>
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Služba novinara</span>
          </div>
          
          <button
            onClick={handleLogout}
            title="Odjavi se sa platforme"
            className="p-2 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-400 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer bg-zinc-50/50 dark:bg-zinc-900 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main content block */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Daily state & Submission panel */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Studio Clock Widget */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-zinc-50 dark:bg-zinc-950/40 rounded-full translate-x-12 -translate-y-12 shrink-0 select-none border border-zinc-100 dark:border-zinc-800/40 pointer-events-none" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Studijski sat</span>
            </div>
            <div className="text-4xl font-mono font-black text-zinc-900 dark:text-white tracking-widest mt-2">{timeStr}</div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Report Submission Box */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden text-left">
            <div className="p-1 bg-indigo-600" />
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                  DNEVNI RADNI LIST
                </h3>
                <p className="text-xs text-zinc-500">
                  Podnesite izveštaj o odrađenim zadacima i novinarskim obavezama za danas.
                </p>
              </div>

              {/* Status Alert Indicator */}
              <div className={`p-4 rounded-lg border flex items-start gap-3 transition-colors ${
                hasSubmittedToday 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                  : 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
              }`}>
                {hasSubmittedToday ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  {hasSubmittedToday ? (
                    <span>
                      <strong>Uspešno podneto:</strong> Vaš radni list za danas je evidentiran u bazi. Uvek ga možete ažurirati ili izmeniti.
                    </span>
                  ) : (
                    <span>
                      <strong>Nije popunjeno:</strong> Još uvek niste popunili radni list za danas. Molimo Vas da ga predate pre završetka radnog dana.
                    </span>
                  )}
                </div>
              </div>

              {/* Central CTA Action Button */}
              <button
                onClick={() => setIsSubmitOpen(true)}
                className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-97 border ${
                  hasSubmittedToday
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{hasSubmittedToday ? 'IZMENI RADNI LIST' : 'POPUNI RADNI LIST'}</span>
              </button>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                <button
                  onClick={() => setIsPasswordOpen(true)}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-350 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border border-zinc-200 dark:border-zinc-850"
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  Promeni lozinku
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Past submissions history */}
        <div className="md:col-span-7 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 text-left">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-zinc-900 dark:text-white">
                Moji Prethodni Izveštaji
              </h3>
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-0.5">
                Istorijat vaših podnetih radnih listova
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">
              Ukupno: {reports.length}
            </span>
          </div>

          {loadingReports ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-400">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Učitavanje istorije...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Nemate prethodnih izveštaja</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">Svi izveštaji koje podnesete biće prikazani ovde hronološkim redosledom.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {reports.map((report) => {
                const isExpanded = !!expandedReports[report.id];
                const formattedDate = new Date(report.date).toLocaleDateString('sr-RS', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const creationTime = new Date(report.createdAt).toLocaleTimeString('sr-RS', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={report.id}
                    className="border border-zinc-100 dark:border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-50/10 dark:bg-zinc-950/5"
                  >
                    <div 
                      onClick={() => toggleExpand(report.id)}
                      className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 select-none"
                    >
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{formattedDate}</span>
                          <span className="text-[9px] font-mono text-zinc-400 ml-2">({creationTime} č)</span>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800/50"
                        >
                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs text-zinc-750 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                            {report.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Footer information bar */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 py-4 px-8 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-auto bg-white dark:bg-zinc-900 shrink-0 select-none">
        Ulogovani ste kao: <span className="text-indigo-600 dark:text-indigo-400 font-black">{userProfile.displayName}</span> • Gostionica Novinarski Panel v1.0
      </footer>

      {/* Modals inside dashboard context */}
      <AnimatePresence>
        {isSubmitOpen && (
          <SubmitWorkReportModal
            isOpen={isSubmitOpen}
            onClose={() => setIsSubmitOpen(false)}
            userProfile={userProfile}
            db={db}
            onSuccess={() => {
              showToast('Radni list uspešno sačuvan!', 'success');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPasswordOpen && (
          <ChangePasswordModal
            isOpen={isPasswordOpen}
            onClose={() => setIsPasswordOpen(false)}
            showToast={showToast}
            userProfile={userProfile}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
