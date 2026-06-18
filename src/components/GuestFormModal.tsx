import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Guest, ShowId, SHOWS, UserProfile, GuestConfirmationStatus } from '../types';
import { X, Calendar, Clock, User, Briefcase, Phone, BookOpen, FileText, CheckCircle, HelpCircle, XCircle, Search } from 'lucide-react';

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guestData: Omit<Guest, 'id'> & { id?: string }) => Promise<void>;
  guest: Guest | null;
  userProfile: UserProfile;
  guests?: Guest[];
}

const PREDEFINED_GUESTS = [
  { fullName: "Abdulkadar Sabah", occupation: "student Medicinskog fakulteta u Beogradu; iz Gaze", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Avramov", occupation: "producent i režiser; osnivač fondacije Lazarica", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Gajović", occupation: "novinar", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Jakšić", occupation: "ekonomista", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Mirković", occupation: "narodni poslanik", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Vulin", occupation: "potpredsednik Vlade Republike Srbije", contactPhone: "", topic: "" },
  { fullName: "Aleksandar Vučić", occupation: "predsednik Republike Srbije", contactPhone: "", topic: "" },
  { fullName: "Ana Brnabić", occupation: "predsednica Narodne skupštine Srbije", contactPhone: "", topic: "" },
  { fullName: "Bojan Bilbija", occupation: "novinar Politike", contactPhone: "", topic: "" },
  { fullName: "Bojan Dimitrijević", occupation: "dr; ekonomista / istoričar", contactPhone: "", topic: "" },
  { fullName: "Boško Đurovski", occupation: "bivši fudbaler", contactPhone: "", topic: "" },
  { fullName: "Boris Bratina", occupation: "prof. dr; ministar informisanja i telekomunikacija", contactPhone: "", topic: "" },
  { fullName: "Branko Babić", occupation: "biznismen", contactPhone: "", topic: "" },
  { fullName: "Branko Radun", occupation: "analitičar", contactPhone: "", topic: "" },
  { fullName: "Danka Nešović", occupation: "direktorka PEP akademije za avijaciju", contactPhone: "", topic: "" },
  { fullName: "Danijel Simić", occupation: "novinar i ratni izveštač", contactPhone: "", topic: "" },
  { fullName: "Darko Glišić", occupation: "ministar za javna ulaganja", contactPhone: "", topic: "" },
  { fullName: "Dejan Miletić", occupation: "prof. dr; Centar za proučavanje globalizacije", contactPhone: "", topic: "" },
  { fullName: "Dejan Tomašević", occupation: "bivši košarkaš", contactPhone: "", topic: "" },
  { fullName: "Demo Beriša", occupation: "ministar za ljudska i manjinska prava i društveni dijalog; predsednik Matice Albanaca u Srbiji", contactPhone: "", topic: "" },
  { fullName: "Dragan Petrović", occupation: "prof. dr; naučni savetnik", contactPhone: "", topic: "" },
  { fullName: "Dragan Vujičić", occupation: "novinar Večernjih novosti", contactPhone: "", topic: "" },
  { fullName: "Dragoslav Bokan", occupation: "književnik; režiser; Institut za nacionalnu strategiju", contactPhone: "", topic: "" },
  { fullName: "Dragoljub Kojčić", occupation: "politički filozof", contactPhone: "", topic: "" },
  { fullName: "Dragoljub Tomašević", occupation: "advokat; bivši advokat porodice Milošević", contactPhone: "", topic: "" },
  { fullName: "Eliezer Papo", occupation: "sefardski rabin", contactPhone: "", topic: "" },
  { fullName: "Igor Damjanović", occupation: "novinar i ratni reporter", contactPhone: "", topic: "" },
  { fullName: "Ilija Kajtez", occupation: "prof. dr; sociolog", contactPhone: "", topic: "" },
  { fullName: "Ivan Ivanović", occupation: "pokret Naši", contactPhone: "", topic: "" },
  { fullName: "Ivan Jegorović", occupation: "autor knjige Od Mišara do Košara", contactPhone: "", topic: "" },
  { fullName: "Ivan Ristić", occupation: "meteorolog", contactPhone: "", topic: "" },
  { fullName: "Ivica Dačić", occupation: "potpredsednik Vlade i ministar unutrašnjih poslova", contactPhone: "", topic: "" },
  { fullName: "Ištvan Kaić", occupation: "analitičar medija", contactPhone: "", topic: "" },
  { fullName: "Li Ming", occupation: "ambasador NR Kine u Srbiji", contactPhone: "", topic: "" },
  { fullName: "Ljuban Karan", occupation: "penzionisani pukovnik KOS", contactPhone: "", topic: "" },
  { fullName: "Ljubinka Milinčić", occupation: "glavna urednica Sputnjika", contactPhone: "", topic: "" },
  { fullName: "Ljubomir Đurić", occupation: "Centar za nacionalnu politiku", contactPhone: "", topic: "" },
  { fullName: "Ljubiša Ristić", occupation: "reditelj", contactPhone: "", topic: "" },
  { fullName: "Luka Kastratović", occupation: "general u penziji", contactPhone: "", topic: "" },
  { fullName: "Marko Đurić", occupation: "ministar spoljnih poslova", contactPhone: "", topic: "" },
  { fullName: "Marko Lakić", occupation: "novinar Politike", contactPhone: "", topic: "" },
  { fullName: "Mario Spasić", occupation: "generalni sekretar Saveta za monitoring, ljudska prava i borbu protiv korupcije Transparentnost", contactPhone: "", topic: "" },
  { fullName: "Mihailo Olujić", occupation: "Centar za društvenu stabilnost", contactPhone: "", topic: "" },
  { fullName: "Mihajlo Rabrenović", occupation: "prof. dr; stručnjak za menadžment državne uprave", contactPhone: "", topic: "" },
  { fullName: "Milan Brdar", occupation: "prof. dr; filozof", contactPhone: "", topic: "" },
  { fullName: "Milan Jolović", occupation: "pukovnik", contactPhone: "", topic: "" },
  { fullName: "Milan Petričković", occupation: "prof. dr; Fakultet političkih nauka", contactPhone: "", topic: "" },
  { fullName: "Milan Veruović", occupation: "bivši telohranitelj premijera Zorana Đinđića", contactPhone: "", topic: "" },
  { fullName: "Milenko Jovanov", occupation: "poslanik SNS", contactPhone: "", topic: "" },
  { fullName: "Milica Đurđević Stamenkovski", occupation: "ministarka za brigu o porodici i demografiju", contactPhone: "", topic: "" },
  { fullName: "Miljko Ristić", occupation: "prof. dr; kardiohirurg", contactPhone: "", topic: "" },
  { fullName: "Milorad Dodik", occupation: "predsednik Republike Srpske", contactPhone: "", topic: "" },
  { fullName: "Milorad Miša Ćirić", occupation: "novinar; Međunarodni klub Diaspora Group", contactPhone: "", topic: "" },
  { fullName: "Miloš Garić", occupation: "Kosovo online", contactPhone: "", topic: "" },
  { fullName: "Miloš Laban", occupation: "profesor; geopolitički analitičar", contactPhone: "", topic: "" },
  { fullName: "Miloš Vučević", occupation: "predsednik Vlade Srbije; predsednik SNS", contactPhone: "", topic: "" },
  { fullName: "Mina Zirojević", occupation: "dr; Institut za uporedno pravo", contactPhone: "", topic: "" },
  { fullName: "Miodrag Jevtić", occupation: "penzionisani pukovnik", contactPhone: "", topic: "" },
  { fullName: "Miroslav Bjegović", occupation: "savetnik za bezbednost premijera Srbije", contactPhone: "", topic: "" },
  { fullName: "Muhamed Hamdi Jusufspahić", occupation: "muftija", contactPhone: "", topic: "" },
  { fullName: "Nebojša Bakarec", occupation: "narodni poslanik", contactPhone: "", topic: "" },
  { fullName: "Nebojša Krstić", occupation: "marketinški stručnjak; medijski analitičar", contactPhone: "", topic: "" },
  { fullName: "Nenad Vuković", occupation: "predsednik Udruženja lobista Srbije", contactPhone: "", topic: "" },
  { fullName: "Nikola Dašić", occupation: "gradonačelnik Kragujevca", contactPhone: "", topic: "" },
  { fullName: "Nikola Rađen", occupation: "sportista; bivši vaterpolista", contactPhone: "", topic: "" },
  { fullName: "Nikola Vuletić", occupation: "državni sekretar", contactPhone: "", topic: "" },
  { fullName: "Nikola Vukelić", occupation: "državni sekretar Ministarstva za brigu o porodici i demografiju", contactPhone: "", topic: "" },
  { fullName: "Pavle Staničić", occupation: "advokat", contactPhone: "", topic: "" },
  { fullName: "Pavel Orensio Dijaz Enandes", occupation: "ambasador Kube", contactPhone: "", topic: "" },
  { fullName: "Perko Matović", occupation: "specijalni savetnik potpredsednika Vlade", contactPhone: "", topic: "" },
  { fullName: "Predrag Azdejković", occupation: "urednik časopisa Optimist", contactPhone: "", topic: "" },
  { fullName: "Predrag Koluvija", occupation: "direktor", contactPhone: "", topic: "" },
  { fullName: "Predrag Marković", occupation: "istoričar", contactPhone: "", topic: "" },
  { fullName: "Ratko Krsmanović", occupation: "predsednik srpskog ogranka Mreže za odbranu čovečanstva", contactPhone: "", topic: "" },
  { fullName: "Rejhan Kurtović", occupation: "prof. dr; državni sekretar Ministarstva za ljudska i manjinska prava", contactPhone: "", topic: "" },
  { fullName: "Saša Adamović", occupation: "istoričar", contactPhone: "", topic: "" },
  { fullName: "Saša Borojević", occupation: "analitičar", contactPhone: "", topic: "" },
  { fullName: "Saša Milovanović", occupation: "direktor Srpskog telegrafa", contactPhone: "", topic: "" },
  { fullName: "Sava Stambolić", occupation: "savetnik premijera Srbije", contactPhone: "", topic: "" },
  { fullName: "Slobodan Stojičević", occupation: "ekspert za informacioni rat", contactPhone: "", topic: "" },
  { fullName: "Sonja Petrović", occupation: "bivša košarkašica", contactPhone: "", topic: "" },
  { fullName: "Stefan Srbljanović", occupation: "Centar za društvenu stabilnost", contactPhone: "", topic: "" },
  { fullName: "Stevan Damjanović", occupation: "advokat", contactPhone: "", topic: "" },
  { fullName: "Stevan Ignjatović", occupation: "penzionisani pilot", contactPhone: "", topic: "" },
  { fullName: "Stevica Deđanski", occupation: "analitičar", contactPhone: "", topic: "" },
  { fullName: "Svetislav Lutovac", occupation: "prof. dr; stručnjak za bezbednost i kontraterorizam", contactPhone: "", topic: "" },
  { fullName: "Toma Fila", occupation: "advokat", contactPhone: "", topic: "" },
  { fullName: "Tomislav Lovreković", occupation: "novinar", contactPhone: "", topic: "" },
  { fullName: "Tomo Kovač", occupation: "general", contactPhone: "", topic: "" },
  { fullName: "Vanja Bulić", occupation: "novinar, pisac i publicista", contactPhone: "", topic: "" },
  { fullName: "Vanja Elez", occupation: "novinar i pisac", contactPhone: "", topic: "" },
  { fullName: "Velibor Stević", occupation: "prof. dr; pukovnik", contactPhone: "", topic: "" },
  { fullName: "Vinko Pandurović", occupation: "general", contactPhone: "", topic: "" },
  { fullName: "Vjerica Radeta", occupation: "potpredsednica Srpske radikalne stranke", contactPhone: "", topic: "" },
  { fullName: "Vladimir Dobrosavljević", occupation: "politički konsultant", contactPhone: "", topic: "" },
  { fullName: "Vladimir Lučić", occupation: "generalni direktor Telekoma Srbija", contactPhone: "", topic: "" },
  { fullName: "Vladimir Marinković", occupation: "predsednik Kongresa srpsko-američkog prijateljstva", contactPhone: "", topic: "" },
  { fullName: "Vladan Petrov", occupation: "prof. dr", contactPhone: "", topic: "" },
  { fullName: "Vladika toplički Petar", occupation: "vladika toplički", contactPhone: "", topic: "" },
  { fullName: "Vojislav Šešelj", occupation: "prof. dr; predsednik Srpske radikalne stranke", contactPhone: "", topic: "" },
  { fullName: "Zlatibor Lončar", occupation: "ministar", contactPhone: "", topic: "" },
  { fullName: "Zoran Anđelković Baki", occupation: "direktor Pošte Srbije; Centar za mir i toleranciju", contactPhone: "", topic: "" },
  { fullName: "Zoran Babić", occupation: "član Glavnog odbora SNS", contactPhone: "", topic: "" },
  { fullName: "Zoran Đorđević", occupation: "član Predsedništva SNS", contactPhone: "", topic: "" },
  { fullName: "Zoran Stojadinović", occupation: "fudbalski menadžer", contactPhone: "", topic: "" },
  { fullName: "Zorana Mihajlović", occupation: "bivša potpredsednica Vlade", contactPhone: "", topic: "" },
  { fullName: "Žarko Popović", occupation: "stručnjak za bezbednost i kriminalistiku", contactPhone: "", topic: "" },
  { fullName: "Željko Šajn", occupation: "novinar", contactPhone: "", topic: "" }
];

export default function GuestFormModal({ isOpen, onClose, onSave, guest, userProfile, guests = [] }: GuestFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [topic, setTopic] = useState('');
  
  // Custom searchable predefined guest selector states
  const [frequentGuestSearch, setFrequentGuestSearch] = useState('');
  const [isFrequentDropdownOpen, setIsFrequentDropdownOpen] = useState(false);

  // Dynamic frequent guests resolver (merges PREDEFINED_GUESTS with other unique entries from the database)
  const getMergedFrequentGuests = () => {
    const list = [...PREDEFINED_GUESTS];
    const seenNames = new Set(list.map(g => g.fullName.toLowerCase().trim()));
    
    if (guests && Array.isArray(guests)) {
      guests.forEach(g => {
        const nameKey = g.fullName.toLowerCase().trim();
        if (nameKey && !seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          list.push({
            fullName: g.fullName,
            occupation: g.occupation || '',
            contactPhone: g.contactPhone || '',
            topic: g.topic || '',
          });
        }
      });
    }
    
    return list;
  };

  const mergedFrequentGuests = getMergedFrequentGuests();
  const filteredFrequentGuests = mergedFrequentGuests.filter(g => {
    const query = frequentGuestSearch.toLowerCase().trim();
    if (!query) return true;
    return g.fullName.toLowerCase().includes(query) || (g.occupation && g.occupation.toLowerCase().includes(query));
  });
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<GuestConfirmationStatus>('predlozen');
  const [showId, setShowId] = useState<ShowId>(ShowId.PRVE_INFO);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Auto populate if editing
  useEffect(() => {
    if (guest) {
      setFullName(guest.fullName);
      setOccupation(guest.occupation);
      setTopic(guest.topic);
      setAppointmentDate(guest.appointmentDate);
      setAppointmentTime(guest.appointmentTime);
      setContactPhone(guest.contactPhone);
      setNotes(guest.notes || '');
      setStatus(guest.status);
      setShowId(guest.showId);
    } else {
      // If adding new, set default show based on logged in user's show
      setFullName('');
      setOccupation('');
      setTopic('');
      // Set to current date as local default format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      setAppointmentDate(today);
      setAppointmentTime('10:00');
      setContactPhone('');
      setNotes('');
      setStatus('predlozen');
      
      // Select first eligible show
      if (userProfile.role === 'admin' || userProfile.assignedShow === 'all') {
        setShowId(ShowId.PRVE_INFO);
      } else if (userProfile.assignedShows && Array.isArray(userProfile.assignedShows) && userProfile.assignedShows.length > 0) {
        setShowId(userProfile.assignedShows[0]);
      } else if (userProfile.assignedShow) {
        setShowId(userProfile.assignedShow);
      } else {
        setShowId(ShowId.PRVE_INFO);
      }
    }
    setValidationError('');
  }, [guest, isOpen, userProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!fullName.trim()) {
      setValidationError('Molimo unesite ime i prezime gosta.');
      return;
    }
    if (!appointmentDate) {
      setValidationError('Molimo izaberite datum gostovanja.');
      return;
    }

    // Time/date conflict detection logic:
    // "ne moze dan pre ni dan posle niti taj dan da postoji mogucnost da moze da se upise taj gost na gostovanje"
    const guestCleanName = fullName.toLowerCase().trim();

    if (guests && Array.isArray(guests)) {
      const conflict = guests.find(g => {
        // Skip current item if editing
        if (guest && g.id === guest.id) return false;
        
        // Match guest name
        const sameGuestName = g.fullName.toLowerCase().trim() === guestCleanName;
        
        if (sameGuestName) {
          const d1 = new Date(g.appointmentDate + "T00:00:00Z");
          const d2 = new Date(appointmentDate + "T00:00:00Z");
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 1) {
              return true;
            }
          }
        }
        return false;
      });

      if (conflict) {
        const conflictShowName = SHOWS[conflict.showId]?.name || conflict.showId;
        const formattedConflictDate = new Date(conflict.appointmentDate).toLocaleDateString('sr-RS');
        setValidationError(
          `Gost "${conflict.fullName}" je već upisan dana ${formattedConflictDate} u emisiji "${conflictShowName}". Nije dozvoljeno zakazati gosta na taj dan, kao ni dan pre ili dan posle tog gostovanja.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const data: Omit<Guest, 'id'> & { id?: string } = {
        fullName: fullName.trim(),
        occupation: occupation.trim(),
        topic: topic.trim(),
        appointmentDate,
        appointmentTime: appointmentTime || '10:00',
        contactPhone: contactPhone.trim(),
        notes: notes.trim(),
        status,
        showId,
        createdByUid: guest ? guest.createdByUid : userProfile.uid,
        createdByEmail: guest ? guest.createdByEmail : userProfile.email,
        createdByName: guest ? guest.createdByName : userProfile.displayName,
        createdAt: guest ? guest.createdAt : new Date().toISOString(),
        ...(guest && {
          id: guest.id,
          updatedByUid: userProfile.uid,
          updatedByEmail: userProfile.email,
          updatedByName: userProfile.displayName,
          updatedAt: new Date().toISOString()
        })
      };

      await onSave(data);
      onClose();
    } catch (err: any) {
      console.error(err);
      setValidationError('Greška pri čuvanju gosta: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Determine which shows this user can manage
  const eligibleShows = useMemo(() => {
    if (userProfile.role === 'admin' || userProfile.assignedShow === 'all') {
      return Object.values(SHOWS);
    }
    if (userProfile.assignedShows && Array.isArray(userProfile.assignedShows) && userProfile.assignedShows.length > 0) {
      return Object.values(SHOWS).filter(show => userProfile.assignedShows?.includes(show.id));
    }
    if (userProfile.assignedShow) {
      return Object.values(SHOWS).filter(show => show.id === userProfile.assignedShow);
    }
    return [];
  }, [userProfile]);

  const canChooseAnyShow = userProfile.role === 'admin' || userProfile.assignedShow === 'all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      >
        <div className="h-1.5 bg-red-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-serif font-black italic uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
              {guest ? 'Izmeni detalje gosta' : 'Upiši novog gosta'}
            </h3>
            <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mt-1 tracking-widest">
              {guest ? `Izmena unosa za emisiju ${SHOWS[guest.showId].name}` : 'Kreirajte novu zabeležbu u rasporedu'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30 text-sm">
            {validationError}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show assignment */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 label-required">
                Emisija / TV Program
              </label>
              <select
                value={showId}
                onChange={(e) => setShowId(e.target.value as ShowId)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs font-semibold"
                disabled={eligibleShows.length <= 1}
              >
                {eligibleShows.map((show) => (
                  <option key={show.id} value={show.id} className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium">
                    {show.name}
                  </option>
                ))}
              </select>
              {eligibleShows.length === 1 && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  (Imate pravo unosa samo za ovu dodeljenu emisiju)
                </p>
              )}
              {eligibleShows.length > 1 && !canChooseAnyShow && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  (Možete izabrati jednu od Vama dodeljenih emisija)
                </p>
              )}
            </div>

            {/* Searchable Predefined Guest Selector - Only when creating a new record */}
            {!guest && (
              <div className="md:col-span-2 bg-gradient-to-r from-zinc-50 to-zinc-100/30 dark:from-zinc-800/40 dark:to-zinc-800/10 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 relative select-none">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-450 mb-2">
                  ⚡ Brzi odabir predefinisanog gosta (Šablon sa pretragom)
                </label>
                
                <div className="relative">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsFrequentDropdownOpen(!isFrequentDropdownOpen)}
                      className="w-full text-left px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer flex items-center justify-between transition-colors min-h-[36px]"
                    >
                      <span className="truncate">
                        {fullName ? `👤 ${fullName} — ${occupation || 'Bez zanimanja'}` : '-- Izaberite čestog gosta sa liste --'}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[10px] ml-1">▼</span>
                    </button>
                    {fullName && (
                      <button
                        type="button"
                        onClick={() => {
                          setFullName('');
                          setOccupation('');
                          setContactPhone('');
                          setTopic('');
                          setFrequentGuestSearch('');
                        }}
                        title="Očisti polja"
                        className="px-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-450 hover:border-rose-200 dark:hover:border-rose-900/40 text-rose-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isFrequentDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden max-h-60 flex flex-col">
                      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Ukucajte ovde za pretragu gosta..."
                          value={frequentGuestSearch}
                          onChange={(e) => setFrequentGuestSearch(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 py-1 max-h-40 scrollbar-thin">
                        {filteredFrequentGuests.length === 0 ? (
                          <div className="px-3 py-4 text-zinc-400 dark:text-zinc-500 text-xs italic text-center text-sans">Nema poklapanja za "{frequentGuestSearch}"</div>
                        ) : (
                          filteredFrequentGuests.map((pg, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setFullName(pg.fullName);
                                setOccupation(pg.occupation);
                                setContactPhone(pg.contactPhone);
                                setTopic(pg.topic);
                                setIsFrequentDropdownOpen(false);
                                setFrequentGuestSearch('');
                              }}
                              className="w-full px-3 py-2 text-left text-zinc-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-xs font-medium transition-colors border-b border-zinc-100/50 dark:border-zinc-800/45 last:border-b-0 cursor-pointer"
                            >
                              <div className="font-bold truncate text-zinc-900 dark:text-zinc-100 text-sans">👤 {pg.fullName}</div>
                              {pg.occupation && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 text-sans">{pg.occupation}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Guest Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 label-required">
                Gost (Ime i Prezime)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="npr. prof. dr. Nikola Tesla"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Funkcija / Zanimanje
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="npr. Spoljnopolitički analitičar"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Kontakt telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="npr. +381 64 1234567"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Datum gostovanja
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Vreme gostovanja
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="time"
                  required
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Conversation Topic */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Tema razgovora
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="npr. Uticaj novih ekonomskih mera na inflaciju"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Status selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Status dolaska
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GuestConfirmationStatus)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs font-semibold"
              >
                <option value="predlozen" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium">📋 Predložen</option>
                <option value="na_cekanju" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium">⏳ Na čekanju</option>
                <option value="potvrdjen" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium">✅ Potvrđen</option>
                <option value="otkazao" className="bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium">❌ Otkazao</option>
              </select>
            </div>

            {/* Notes / Napomena */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Napomene i logistički detalji
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Upišite detalje o prevozu, posebnim zahtevima ili dodatnim rekvizitima..."
                  rows={2}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-white text-white rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'ČUVANJE...' : 'SAČUVAJ UNOSE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
