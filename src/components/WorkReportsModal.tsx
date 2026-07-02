import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { X, Calendar, Search, Loader, FileText, ChevronDown, ChevronUp, Download, RefreshCw, AlertCircle, Users, UserX, CheckCircle2 } from 'lucide-react';
import { UserProfile, WorkReport } from '../types';

interface WorkReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: any;
}

export default function WorkReportsModal({
  isOpen,
  onClose,
  db
}: WorkReportsModalProps) {
  const [allReports, setAllReports] = useState<WorkReport[]>([]);
  const [journalists, setJournalists] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs & expanding states
  const [viewTab, setViewTab] = useState<'daily' | 'journalists'>('daily');
  const [expandedJournalists, setExpandedJournalists] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  
  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA') // Default to today's local date
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  // Subscribe to all journalists
  useEffect(() => {
    if (isOpen) {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'journalist')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setJournalists(list);
      }, (err) => {
        console.error('Error fetching journalists list:', err);
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  // Subscribe to ALL work reports
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      
      const q = query(collection(db, 'work_reports'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: WorkReport[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as WorkReport);
        });
        
        // Sort by date descending, then createdAt descending
        list.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setAllReports(list);
        setLoading(false);
      }, (err) => {
        console.error('Error listening to all work reports:', err);
        setError('Neuspešno učitavanje izveštaja iz baze.');
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [isOpen]);

  const reports = allReports.filter(r => r.date === selectedDate);

  const toggleExpand = (id: string) => {
    setExpandedReports(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredReports = reports.filter(r => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      r.userDisplayName.toLowerCase().includes(query) ||
      r.userEmail.toLowerCase().includes(query) ||
      r.content.toLowerCase().includes(query)
    );
  });

  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    // Build CSV Content
    const headers = ['Datum', 'Novinar / Urednik', 'Email', 'Vreme slanja', 'Tekst Izvestaja'];
    const rows = filteredReports.map(r => [
      r.date,
      r.userDisplayName,
      r.userEmail,
      new Date(r.createdAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
      `"${r.content.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Radni_listovi_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unsubmittedJournalists = journalists.filter(
    j => !reports.some(r => r.userId === j.uid)
  );

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  };

  const getGroupedReportsForJournalist = (userId: string) => {
    const journalistReports = allReports.filter(r => r.userId === userId);
    
    // Group by Year and Month
    const groups: Record<string, { monthLabel: string, monthKey: string, reports: WorkReport[] }> = {};
    
    journalistReports.forEach(r => {
      if (!r.date) return;
      const reportDate = parseLocalDate(r.date);
      const monthLabel = reportDate.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });
      const monthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          monthKey,
          reports: []
        };
      }
      groups[monthKey].reports.push(r);
    });
    
    // Sort months descending
    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  };

  const toggleJournalistExpand = (id: string) => {
    setExpandedJournalists(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleMonthExpand = (userId: string, monthKey: string) => {
    const key = `${userId}-${monthKey}`;
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredJournalists = journalists.filter(j => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      j.displayName.toLowerCase().includes(query) ||
      j.email.toLowerCase().includes(query)
    );
  });

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
            className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black italic uppercase tracking-widest font-mono text-zinc-900 dark:text-white">
                    RADNI LISTOVI NOVINARA
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Pregled dnevnih izveštaja i radnih obaveza
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header: Filters & Search */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {viewTab === 'daily' ? (
                  <>
                    {/* Date Picker Filter */}
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs font-mono font-bold"
                      />
                    </div>

                    {/* Reset to Today button */}
                    {selectedDate !== new Date().toLocaleDateString('en-CA') && (
                      <button
                        onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 animate-pulse" />
                        Danas
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span>Pregled celokupne istorije po novinarima</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={viewTab === 'daily' ? "Pretraži po imenu ili tekstu..." : "Pretraži novinare..."}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs placeholder:text-zinc-400 font-medium"
                  />
                </div>

                {/* CSV Export for reports */}
                {viewTab === 'daily' && (
                  <button
                    onClick={handleExportCSV}
                    disabled={filteredReports.length === 0}
                    className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Izvezi</span>
                  </button>
                )}
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 select-none">
              <button
                onClick={() => setViewTab('daily')}
                className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  viewTab === 'daily'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-950/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850/30'
                }`}
              >
                Dnevni pregled
              </button>
              <button
                onClick={() => setViewTab('journalists')}
                className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  viewTab === 'journalists'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-950/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850/30'
                }`}
              >
                Pregled po novinarima po mesecima
              </button>
            </div>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/20 dark:bg-zinc-950/10">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 py-20">
                  <Loader className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Učitavanje izveštaja...</span>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900/50 flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : viewTab === 'daily' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Reports List (col-span-8) */}
                  <div className="lg:col-span-8 space-y-4">
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                      Podneti radni listovi ({filteredReports.length})
                    </h4>
                    
                    {filteredReports.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-200 dark:border-zinc-850 rounded bg-white dark:bg-zinc-900/40 text-center shadow-2xs">
                        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Nema upisanih radnih listova
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-normal">
                          Za izabrani datum ({new Date(selectedDate).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })}) novinari još uvek nisu podneli radne listove, ili se nijedan izveštaj ne poklapa sa pretragom.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredReports.map((report) => {
                          const isExpanded = !!expandedReports[report.id];
                          const reportTime = new Date(report.createdAt).toLocaleTimeString('sr-RS', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          
                          return (
                            <div
                              key={report.id}
                              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded shadow-xs overflow-hidden transition-all"
                            >
                              {/* Summary Header */}
                              <div
                                onClick={() => toggleExpand(report.id)}
                                className="px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/40 select-none"
                              >
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-200 dark:border-zinc-750">
                                    {report.userDisplayName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                      {report.userDisplayName}
                                    </p>
                                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium truncate mt-0.5">
                                      {report.userEmail}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 shrink-0">
                                  <span className="text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                                    {reportTime} č
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                  )}
                                </div>
                              </div>

                              {/* Collapsible Content */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800/80"
                                  >
                                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
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

                  {/* Right Column: Journalists Status Panel (col-span-4) */}
                  <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-4 shadow-sm sticky top-0 space-y-4">
                    <div className="border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                          Status novinara
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-450 px-1.5 py-0.5 rounded">
                        Ukupno: {journalists.length}
                      </span>
                    </div>

                    {journalists.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                        Nema registrovanih novinara na platformi.
                      </div>
                    ) : unsubmittedJournalists.length === 0 ? (
                      <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 dark:text-emerald-400" />
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Svi su poslali! 🎉
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal">
                          Svi registrovani novinari su uspešno popunili radni list za ovaj dan.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                          <UserX className="w-3.5 h-3.5 shrink-0" />
                          <span>Nisu popunili ({unsubmittedJournalists.length}):</span>
                        </div>

                        <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                          {unsubmittedJournalists.map((j) => (
                            <div 
                              key={j.uid}
                              className="p-2 border border-zinc-100 dark:border-zinc-800/80 rounded bg-zinc-50/50 dark:bg-zinc-950/10 flex items-center gap-2 min-w-0"
                            >
                              <div className="w-6 h-6 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-100/50 dark:border-amber-900/30">
                                {j.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                  {j.displayName}
                                </p>
                                <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                                  {j.email}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Grouped Month-By-Month Journalist Tab */
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                    Registrovani novinari ({filteredJournalists.length})
                  </h4>

                  {filteredJournalists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-200 dark:border-zinc-850 rounded bg-white dark:bg-zinc-900/40 text-center shadow-2xs">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        Nije pronađen nijedan novinar
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-normal">
                        Nijedan novinar se ne poklapa sa traženom pretragom.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {filteredJournalists.map((j) => {
                        const isJournalistExpanded = !!expandedJournalists[j.uid];
                        const journalistReports = allReports.filter(r => r.userId === j.uid);
                        const groupedMonths = getGroupedReportsForJournalist(j.uid);

                        return (
                          <div
                            key={j.uid}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200/85 dark:border-zinc-800 rounded shadow-xs overflow-hidden transition-all"
                          >
                            {/* Journalist Header Row */}
                            <div
                              onClick={() => toggleJournalistExpand(j.uid)}
                              className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/30 select-none"
                            >
                              <div className="flex items-center space-x-3.5 min-w-0">
                                <div className="w-9 h-9 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                                  {j.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                    {j.displayName}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                                    {j.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3.5 shrink-0">
                                <span className="text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-100/30 dark:border-indigo-900/20">
                                  Ukupno izveštaja: {journalistReports.length}
                                </span>
                                {isJournalistExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                )}
                              </div>
                            </div>

                            {/* Journalist Expanded: Month-by-month list */}
                            <AnimatePresence initial={false}>
                              {isJournalistExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-4"
                                >
                                  {groupedMonths.length === 0 ? (
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-4">
                                      Nema podnetih radnih listova za ovog novinara.
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {groupedMonths.map((group) => {
                                        const isMonthExpanded = !!expandedMonths[`${j.uid}-${group.monthKey}`];

                                        return (
                                          <div
                                            key={group.monthKey}
                                            className="border border-zinc-200/60 dark:border-zinc-800/60 rounded bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs"
                                          >
                                            {/* Month Clickable Selector */}
                                            <div
                                              onClick={() => toggleMonthExpand(j.uid, group.monthKey)}
                                              className="px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-850/40 flex items-center justify-between text-xs font-bold text-zinc-750 dark:text-zinc-250 cursor-pointer select-none border-b border-zinc-100 dark:border-zinc-800/40"
                                            >
                                              <span className="font-sans uppercase tracking-wider text-[10px] text-zinc-600 dark:text-zinc-350">{group.monthLabel}</span>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                                  {group.reports.length}
                                                </span>
                                                {isMonthExpanded ? (
                                                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                                                ) : (
                                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                                )}
                                              </div>
                                            </div>

                                            {/* Month Submissions Day-by-Day */}
                                            <AnimatePresence initial={false}>
                                              {isMonthExpanded && (
                                                <motion.div
                                                  initial={{ height: 0 }}
                                                  animate={{ height: 'auto' }}
                                                  exit={{ height: 0 }}
                                                  className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-950/5"
                                                >
                                                  {group.reports.map((report) => {
                                                    const isReportExpanded = !!expandedReports[report.id];
                                                    const formattedDay = parseLocalDate(report.date).toLocaleDateString('sr-RS', {
                                                      day: '2-digit',
                                                      month: 'long'
                                                    });
                                                    const reportTime = new Date(report.createdAt).toLocaleTimeString('sr-RS', {
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    });

                                                    return (
                                                      <div key={report.id} className="transition-all">
                                                        {/* Day Header Row */}
                                                        <div
                                                          onClick={() => toggleExpand(report.id)}
                                                          className="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-850/20 select-none text-[11px]"
                                                        >
                                                          <div className="flex items-center space-x-2 min-w-0">
                                                            <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                                              {formattedDay}
                                                            </span>
                                                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                              ({reportTime} č)
                                                            </span>
                                                          </div>
                                                          {isReportExpanded ? (
                                                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                                                          ) : (
                                                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                                          )}
                                                        </div>

                                                        {/* Day Expanded Report content */}
                                                        <AnimatePresence initial={false}>
                                                          {isReportExpanded && (
                                                            <motion.div
                                                              initial={{ height: 0, opacity: 0 }}
                                                              animate={{ height: 'auto', opacity: 1 }}
                                                              exit={{ height: 0, opacity: 0 }}
                                                              className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/20"
                                                            >
                                                              <div className="p-4 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
                                                                {report.content}
                                                              </div>
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </div>
                                                    );
                                                  })}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between text-[10px] text-zinc-400 font-bold tracking-wider uppercase shrink-0">
              <span>{viewTab === 'daily' ? `Broj izveštaja za danas: ${reports.length}` : `Ukupno arhiviranih izveštaja: ${allReports.length}`}</span>
              <span>Sistem radnih listova v1.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
