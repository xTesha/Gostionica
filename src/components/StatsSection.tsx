import React from 'react';
import { Guest } from '../types';

interface StatsSectionProps {
  guests: Guest[];
}

export default function StatsSection({ guests }: StatsSectionProps) {
  const total = guests.length;
  const confirmed = guests.filter((g) => g.status === 'potvrdjen').length;
  const pending = guests.filter((g) => g.status === 'na_cekanju' || g.status === 'predlozen').length;
  const cancelled = guests.filter((g) => g.status === 'otkazao').length;

  return (
    <div className="p-4 md:px-6 md:py-4 grid grid-cols-2 md:flex md:flex-wrap gap-4 md:gap-x-12 md:gap-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm mb-6">
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 md:p-0 rounded md:bg-transparent">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Ukupno upisanih</p>
        <p className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1 md:mt-0">{total}</p>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 md:p-0 rounded md:bg-transparent">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Potvrđeni gosti</p>
        <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-1 md:mt-0">{confirmed}</p>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 md:p-0 rounded md:bg-transparent">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Čekanje / Predlozi</p>
        <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-500 mt-1 md:mt-0">{pending}</p>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 md:p-0 rounded md:bg-transparent">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Otkazani</p>
        <p className="text-xl md:text-2xl font-black text-red-600 dark:text-red-500 mt-1 md:mt-0">{cancelled}</p>
      </div>
    </div>
  );
}
