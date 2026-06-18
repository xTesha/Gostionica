export enum ShowId {
  BUDILNIK = "budilnik",
  PRVE_INFO = "prve_info",
  INFO_JUTRO = "info_jutro",
  INFO_DAN = "info_dan",
  BEZ_GARDA = "bez_garda",
  DA_SE_NE_LAZEMO = "da_se_ne_lazemo",
  TAJNE_SVETOG_PISMA = "tajne_svetog_pisma",
  RAT_UZIVO = "rat_uzivo",
  OTVORENI_STUDIO = "otvoreni_studio",
  NEPRIJATELJ_VREBA = "neprijatelj_vreba",
  POLITICKI_OKVIR = "politicki_okvir",
  PARALELA = "paralela",
  STAV = "stav"
}

export interface ShowConfig {
  id: ShowId;
  name: string;
  description: string;
  color: string;       // Theme base color string (e.g. "sky", "indigo", "rose")
  bgClass: string;     // Tailwind background color class
  textClass: string;   // Tailwind text color class
  borderClass: string; // Tailwind border class
  badgeClass: string;  // Tailwind badge styling
}

export const SHOWS: Record<ShowId, ShowConfig> = {
  [ShowId.BUDILNIK]: {
    id: ShowId.BUDILNIK,
    name: "Budilnik",
    description: "Jutarnji budilnik program na televiziji",
    color: "orange",
    bgClass: "bg-orange-50/50 dark:bg-orange-950/20",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-100 dark:border-orange-900/50",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200"
  },
  [ShowId.PRVE_INFO]: {
    id: ShowId.PRVE_INFO,
    name: "Prve Info",
    description: "Pregled ranojutarnjih vesti i izveštaja",
    color: "blue",
    bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-100 dark:border-blue-900/50",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
  },
  [ShowId.INFO_JUTRO]: {
    id: ShowId.INFO_JUTRO,
    name: "Info jutro",
    description: "Jutarnji magazin, analize i intervjui uživo",
    color: "indigo",
    bgClass: "bg-indigo-50/50 dark:bg-indigo-950/20",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-100 dark:border-indigo-900/50",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200"
  },
  [ShowId.INFO_DAN]: {
    id: ShowId.INFO_DAN,
    name: "Info dan",
    description: "Dnevni pregled, uključenja i centralne teme",
    color: "sky",
    bgClass: "bg-sky-50/50 dark:bg-sky-950/20",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-100 dark:border-sky-900/50",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200"
  },
  [ShowId.BEZ_GARDA]: {
    id: ShowId.BEZ_GARDA,
    name: "Bez garda",
    description: "Slobodna diskusija i životne ispovesti poznatih ličnosti",
    color: "emerald",
    bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-100 dark:border-emerald-900/50",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-350 dark:bg-emerald-950/60 dark:text-emerald-200"
  },
  [ShowId.DA_SE_NE_LAZEMO]: {
    id: ShowId.DA_SE_NE_LAZEMO,
    name: "Da se ne lažemo",
    description: "Direktna pitanja i razjašnjavanja sa donosiocima odluka",
    color: "amber",
    bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-100 dark:border-amber-900/50",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
  },
  [ShowId.TAJNE_SVETOG_PISMA]: {
    id: ShowId.TAJNE_SVETOG_PISMA,
    name: "Tajne svetog pisma",
    description: "Duhovne i biblijske pouke i razgovori",
    color: "violet",
    bgClass: "bg-violet-50/50 dark:bg-violet-950/20",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-100 dark:border-violet-900/50",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200"
  },
  [ShowId.RAT_UZIVO]: {
    id: ShowId.RAT_UZIVO,
    name: "Rat uživo",
    description: "Izveštavanje i vojno-političke analize sa terena",
    color: "rose",
    bgClass: "bg-rose-50/50 dark:bg-rose-950/20",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-100 dark:border-rose-900/50",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
  },
  [ShowId.OTVORENI_STUDIO]: {
    id: ShowId.OTVORENI_STUDIO,
    name: "Otvoreni studio",
    description: "Dijalog sa gostima i komentari gledalaca",
    color: "purple",
    bgClass: "bg-purple-50/50 dark:bg-purple-950/20",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-100 dark:border-purple-900/50",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200"
  },
  [ShowId.NEPRIJATELJ_VREBA]: {
    id: ShowId.NEPRIJATELJ_VREBA,
    name: "Neprijatelj vreba",
    description: "Bezbednosna i geopolitička pitanja i diskusije",
    color: "slate",
    bgClass: "bg-slate-50/50 dark:bg-slate-900/20",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-100 dark:border-slate-800",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
  },
  [ShowId.POLITICKI_OKVIR]: {
    id: ShowId.POLITICKI_OKVIR,
    name: "Politički okvir",
    description: "Politička zbivanja i debatna emisija",
    color: "teal",
    bgClass: "bg-teal-50/50 dark:bg-teal-950/20",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-100 dark:border-teal-900/50",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
  },
  [ShowId.PARALELA]: {
    id: ShowId.PARALELA,
    name: "Paralela",
    description: "Spoj globalnih geopolitičkih kretanja i lokalnih odjeka",
    color: "fuchsia",
    bgClass: "bg-fuchsia-50/50 dark:bg-fuchsia-950/20",
    textClass: "text-fuchsia-700 dark:text-fuchsia-300",
    borderClass: "border-fuchsia-100 dark:border-fuchsia-900/50",
    badgeClass: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200"
  },
  [ShowId.STAV]: {
    id: ShowId.STAV,
    name: "Stav",
    description: "Emisija autorskih uverenja i otvorenih stavova na društvene teme",
    color: "lime",
    bgClass: "bg-lime-50/50 dark:bg-lime-950/20",
    textClass: "text-lime-700 dark:text-lime-300",
    borderClass: "border-lime-100 dark:border-lime-900/50",
    badgeClass: "bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-200"
  }
};

export type UserRole = "admin" | "editor" | "viewer";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedShow: ShowId | "all";
  createdAt: string;
}

export type GuestConfirmationStatus = "potvrdjen" | "otkazao" | "na_cekanju" | "predlozen";

export interface GuestStatusConfig {
  label: string;
  colorClass: string;
  bgClass: string;
}

export const GUEST_STATUS_MAP: Record<GuestConfirmationStatus, GuestStatusConfig> = {
  potvrdjen: {
    label: "Potvrđen",
    colorClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40"
  },
  otkazao: {
    label: "Otkazao",
    colorClass: "text-rose-700 dark:text-rose-400",
    bgClass: "bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40"
  },
  na_cekanju: {
    label: "Na čekanju",
    colorClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40"
  },
  predlozen: {
    label: "Predložen",
    colorClass: "text-indigo-700 dark:text-indigo-400",
    bgClass: "bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/40"
  }
};

export interface Guest {
  id: string; // Document Firestore ID
  fullName: string;
  occupation: string;
  topic: string;
  appointmentDate: string; // e.g. "2026-06-18"
  appointmentTime: string; // e.g. "10:30"
  contactPhone: string;
  notes: string;
  status: GuestConfirmationStatus;
  showId: ShowId;
  createdByUid: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  updatedByName?: string;
  updatedAt?: string;
}
