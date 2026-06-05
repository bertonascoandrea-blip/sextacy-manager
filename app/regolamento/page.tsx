import { NavBar } from '@/components/NavBar'

interface Section {
  title: string
  icon: string
  items: string[]
}

const sections: Section[] = [
  {
    title: 'Struttura del torneo',
    icon: '🏆',
    items: [
      '2 gironi da 5 squadre (Girone 1 e Girone 2)',
      'Le prime 3 classificate di ogni girone si qualificano direttamente ai quarti di finale',
      'La 4ª e la 5ª classificata di ogni girone disputano un playoff per l\'accesso ai quarti',
      'Quarti di finale, Semifinali e Finale a eliminazione diretta',
    ],
  },
  {
    title: 'Durata delle partite',
    icon: '⏱️',
    items: [
      'Fase a gironi e quarti di finale: 2 tempi da 12 minuti',
      'Semifinali e finale: 2 tempi da 15 minuti',
      'Pausa tra i tempi: 1 minuto',
      'Il tempo si ferma solo per infortuni gravi o indicazione dell\'arbitro',
    ],
  },
  {
    title: 'Supplementari e rigori',
    icon: '🔄',
    items: [
      'In caso di parità al termine dei tempi regolamentari si disputano supplementari',
      'Supplementari: 1 tempo unico da 5 minuti',
      'Se la parità persiste: tiri di rigore (3 rigori a testa)',
      'In caso di ulteriore parità: rigori a oltranza, uno alla volta',
    ],
  },
  {
    title: 'Sostituzioni',
    icon: '🔄',
    items: [
      'Sostituzioni illimitate durante la partita',
      'Sostituzioni volanti (senza stop al gioco) per i giocatori di movimento',
      'La sostituzione del portiere richiede l\'interruzione del gioco e l\'autorizzazione dell\'arbitro',
      'Un giocatore sostituito può rientrare in campo',
    ],
  },
  {
    title: 'Portiere',
    icon: '🧤',
    items: [
      'Il portiere non può raccogliere con le mani un retropassaggio effettuato di piede dal compagno',
      'Dopo aver preso il pallone in mano, il portiere ha 5 secondi per rimettere in gioco',
      'Se il portiere supera i 5 secondi, viene assegnato un calcio indiretto agli avversari',
      'Il portiere può giocare come giocatore di movimento oltre la propria metà campo',
    ],
  },
  {
    title: 'Sanzioni disciplinari',
    icon: '🟨',
    items: [
      '3 cartellini gialli nello stesso torneo equivalgono a 1 turno di squalifica',
      'Cartellino rosso diretto: squalifica per la partita successiva',
      'Il giocatore espulso lascia il campo — la squadra gioca in inferiorità numerica per 5 minuti',
      'Dopo i 5 minuti la squadra può reintegrare un giocatore (non quello espulso)',
      'In caso di espulsione per doppio giallo: si accumulano 2 ammonizioni verso la squalifica',
    ],
  },
  {
    title: 'Regole sul gol',
    icon: '⚽',
    items: [
      'Il gol segnato direttamente da una rimessa laterale non è valido',
      'Palo o traversa non equivalgono a gol, il gioco continua normalmente',
      'Gol in auto-rete: il punto viene assegnato alla squadra che ha subito il gol',
    ],
  },
  {
    title: 'Abbigliamento e campo',
    icon: '👕',
    items: [
      'Campo La Salle: i tacchetti sono consentiti',
      'Campo GO (Grugliasco Oratorio): i tacchetti NON sono consentiti — obbligatorie scarpe da calcetto o ginnastica',
      'Le squadre devono presentarsi con maglie dello stesso colore o indossare i pettorina forniti',
    ],
  },
  {
    title: 'Criteri di classifica',
    icon: '📊',
    items: [
      '1. Punti (vittoria = 3 pt, pareggio = 1 pt, sconfitta = 0 pt)',
      '2. Scontro diretto (risultato della partita tra le squadre interessate)',
      '3. Differenza reti (gol fatti − gol subiti)',
      '4. Più vittorie',
      '5. Più gol segnati',
      '6. Meno gol subiti',
      '7. Sorteggio',
    ],
  },
]

export default function RegolamentoPage() {
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-white">Regolamento</h1>
          <p className="text-slate-400 text-xs">Torneo 12 Ore · Grugliasco Oratorio 2026</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.title} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-800">
                <span className="text-xl">{section.icon}</span>
                <h2 className="text-sm font-bold text-white">{section.title}</h2>
              </div>
              <ul className="px-4 py-3 flex flex-col gap-2.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">•</span>
                    <span className="text-slate-300 text-sm leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Schedule table */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
              <span className="text-xl">📅</span>
              <h2 className="text-sm font-bold text-white">Calendario Girone 1 — Sextacy (A)</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {[
                { time: '08:30', match: 'A – B', desc: 'Sextacy vs Cunico FC' },
                { time: '09:30', match: 'E – A', desc: 'Porceddus FC vs Sextacy' },
                { time: '11:00', match: 'D – A', desc: 'Los Mantos vs Sextacy' },
                { time: '12:30', match: 'A – C', desc: 'Sextacy vs GDB' },
                { time: '13:00', match: 'E – B', desc: 'Porceddus FC vs Cunico FC' },
              ].map(row => (
                <div key={row.time} className={`flex items-center gap-3 px-4 py-3 ${row.desc.includes('Sextacy') ? 'bg-green-900/20' : ''}`}>
                  <span className="text-green-400 font-mono text-sm font-bold w-12">{row.time}</span>
                  <span className="text-slate-400 text-xs w-12">{row.match}</span>
                  <span className={`text-sm ${row.desc.includes('Sextacy') ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {row.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <NavBar />
    </div>
  )
}
