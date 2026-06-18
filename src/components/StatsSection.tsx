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
    <div className="px-6 py-4 flex flex-wrap gap-x-12 gap-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm mb-6">
      <div>
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ukupno upisanih</p>
        <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{total}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Potvrđeni gosti</p>
        <p className="text-xl font-black text-emerald-600 dark:text-emerald-500">{confirmed}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Čekanje / Predlozi</p>
        <p className="text-xl font-black text-amber-600 dark:text-amber-500">{pending}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Otkazani</p>
        <p className="text-xl font-black text-red-600 dark:text-red-500">{cancelled}</p>
      </div>
    </div>
  );
}
