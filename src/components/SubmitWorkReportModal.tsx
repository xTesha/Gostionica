import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { X, FileText, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import { UserProfile, WorkReport } from '../types';

interface SubmitWorkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  db: any;
  onSuccess: () => void;
}

export default function SubmitWorkReportModal({
  isOpen,
  onClose,
  userProfile,
  db,
  onSuccess
}: SubmitWorkReportModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hasExistingReport, setHasExistingReport] = useState(false);

  // Get current local date in YYYY-MM-DD format
  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-CA'); // Always YYYY-MM-DD in local time
  };

  const getAvailableDates = () => {
    return [0, 1, 2, 3].map(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return {
        dateStr: d.toLocaleDateString('en-CA'),
        displayLabel: d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' }) + 
          (offset === 0 ? ' (Danas)' : offset === 1 ? ' (Juče)' : offset === 2 ? ' (Pre 2 dana)' : ' (Pre 3 dana)')
      };
    });
  };

  useEffect(() => {
    if (isOpen) {
      const today = getTodayDateString();
      setSelectedDate(today);
      setContent('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      checkExistingReport(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const checkExistingReport = async (dateToCheck: string) => {
    try {
      const q = query(
        collection(db, 'work_reports'),
        where('userId', '==', userProfile.uid),
        where('date', '==', dateToCheck)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setHasExistingReport(true);
        const docData = querySnapshot.docs[0].data();
        setContent(docData.content || '');
      } else {
        setHasExistingReport(false);
        setContent('');
      }
    } catch (err) {
      console.error('Error checking existing work report:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Molimo Vas da unesete tekst izveštaja.');
      return;
    }

    if (hasExistingReport) {
      setError('Izmena postojećeg izveštaja nije dozvoljena.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reportId = `${userProfile.uid}_${selectedDate}`;
      const reportRef = doc(db, 'work_reports', reportId);

      const reportData: WorkReport = {
        id: reportId,
        userId: userProfile.uid,
        userEmail: userProfile.email,
        userDisplayName: userProfile.displayName,
        date: selectedDate,
        content: content.trim(),
        createdAt: new Date().toISOString()
      };

      await setDoc(reportRef, reportData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting work report:', err);
      setError('Greška prilikom čuvanja izveštaja: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-800 dark:text-zinc-200">
                  <span className="text-sm font-black italic uppercase tracking-widest font-mono">Dnevni Radni List</span>
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Novinar / Urednik
                </label>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-mono rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span>{userProfile.displayName} ({userProfile.email})</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 uppercase rounded">
                    {userProfile.role === 'admin' ? 'Superurednik' : userProfile.role === 'editor' ? 'Urednik' : 'Novinar'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Izaberite datum za izveštaj
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableDates().map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(item.dateStr)}
                        className={`p-2 rounded border text-center transition-all cursor-pointer text-xs font-mono font-medium ${
                          isSelected
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white font-bold shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {item.displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasExistingReport && (
                <div className="p-3 bg-red-55/10 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900/50 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Izveštaj za ovaj datum je već podnet.</span> Ponovno slanje ili izmena već postojećih radnih listova nisu dozvoljeni.
                  </div>
                </div>
              )}

              {success ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Uspravno sačuvano!</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Vaš radni list je uspešno zabeležen u bazi podataka.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                    Šta ste radili tokom smene? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    disabled={hasExistingReport}
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={hasExistingReport ? "Za izabrani datum ste već popunili radni list." : "Unesite detalje o Vašem radu (vreme dolaska, urađeni prilozi, gosti, statusi emisije, napomene)..."}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs border border-zinc-300 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400 leading-relaxed resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-zinc-400">
                    * Popunjavanje radnog lista je obavezno pre završetka smene. Izveštaj mogu videti samo urednici i administratori.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {error}
                </p>
              )}

              {!success && (
                <div className="flex items-center justify-end space-x-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-850"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    disabled={loading || hasExistingReport}
                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Slanje...</span>
                      </>
                    ) : (
                      <span>Pošalji radni list</span>
                    )}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
