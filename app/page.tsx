'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { NewMatchModal } from '@/components/NewMatchModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import type { Match, MatchPhase } from '@/lib/types'

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-900 text-blue-300',
  pending: 'bg-slate-600 text-slate-200',
  live: 'bg-red-600 text-white animate-pulse',
  done: 'bg-slate-700 text-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  planned: '📋 Pianificata',
  pending: 'In attesa',
  live: 'LIVE',
  done: 'Terminata',
}

const PHASE_LABEL: Record<string, string> = {
  girone: 'Girone',
  playoff: 'Playoff',
  quarti: 'Quarti',
  semi: 'Semifinale',
  finale: 'Finale',
}

// Morning matches for tournament day (6 giugno 2026, orario italiano CEST +02:00)
const MORNING_MATCHES = [
  { opponent: 'Cunico FC',    scheduled_time: '2026-06-06T08:30:00+02:00', half_duration_mins: 12, phase: 'girone' as MatchPhase },
  { opponent: 'Porceddus FC', scheduled_time: '2026-06-06T09:30:00+02:00', half_duration_mins: 12, phase: 'girone' as MatchPhase },
  { opponent: 'Los Mantos',   scheduled_time: '2026-06-06T11:00:00+02:00', half_duration_mins: 12, phase: 'girone' as MatchPhase },
  { opponent: 'GDB',          scheduled_time: '2026-06-06T12:30:00+02:00', half_duration_mins: 12, phase: 'girone' as MatchPhase },
]

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const preloaded = useRef(false)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('matches')
      .select('*')
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Errore caricamento partite', 'error')
      setLoading(false)
      return
    }

    const list = data || []
    setMatches(list)
    setLoading(false)

    // Pre-load morning matches only once, only if DB is empty
    if (list.length === 0 && !preloaded.current) {
      preloaded.current = true
      await seedMorningMatches()
    }
  }

  const seedMorningMatches = async () => {
    const sb = getSupabase()
    const rows = MORNING_MATCHES.map(m => ({ ...m, status: 'pending', score_us: 0, score_them: 0 }))
    const { data, error } = await sb.from('matches').insert(rows).select()
    if (error) {
      showToast('Errore pre-caricamento partite', 'error')
    } else {
      setMatches((data || []).sort(
        (a: Match, b: Match) =>
          new Date(a.scheduled_time ?? 0).getTime() - new Date(b.scheduled_time ?? 0).getTime()
      ))
      showToast('Partite del girone pre-caricate!', 'success')
    }
  }

  const handleCreateMatch = async (data: {
    opponent: string
    scheduled_time: string
    half_duration_mins: number
    phase: MatchPhase
  }) => {
    const sb = getSupabase()
    const payload: Record<string, unknown> = {
      opponent: data.opponent,
      half_duration_mins: data.half_duration_mins,
      phase: data.phase,
      status: 'pending',
      score_us: 0,
      score_them: 0,
    }
    if (data.scheduled_time) payload.scheduled_time = data.scheduled_time

    const { data: newMatch, error } = await sb
      .from('matches')
      .insert(payload)
      .select()
      .single()

    if (error) {
      showToast('Errore creazione partita', 'error')
      return
    }

    showToast('Partita creata!', 'success')
    setShowNew(false)
    setMatches(prev => [newMatch, ...prev])
    router.push(`/match/${newMatch.id}/lineup`)
  }

  const handleCreatePlan = async (data: {
    opponent: string
    scheduled_time: string
    half_duration_mins: number
    phase: MatchPhase
  }) => {
    const sb = getSupabase()
    const payload: Record<string, unknown> = {
      opponent: data.opponent,
      half_duration_mins: data.half_duration_mins,
      phase: data.phase,
      status: 'planned',
      score_us: 0,
      score_them: 0,
    }
    if (data.scheduled_time) payload.scheduled_time = data.scheduled_time

    const { data: newMatch, error } = await sb
      .from('matches')
      .insert(payload)
      .select()
      .single()

    if (error) {
      showToast('Errore creazione pianificazione', 'error')
      return
    }

    setShowPlan(false)
    router.push(`/match/${newMatch.id}/plan`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const sb = getSupabase()
    const { error } = await sb.from('matches').delete().eq('id', deleteTarget.id)
    if (error) {
      showToast('Errore eliminazione', 'error')
    } else {
      setMatches(prev => prev.filter(m => m.id !== deleteTarget.id))
      showToast('Partita eliminata', 'info')
    }
    setDeleteTarget(null)
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return null
    return new Date(iso).toLocaleString('it-IT', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">SEXTACY</h1>
            <p className="text-green-400 text-xs font-semibold">MANAGER</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowNew(true)}
              className="bg-green-700 active:bg-green-800 text-white font-bold px-3 py-2 rounded-xl text-xs"
            >
              + Nuova Partita
            </button>
            <button
              onClick={() => setShowPlan(true)}
              className="bg-blue-800 active:bg-blue-900 text-white font-bold px-3 py-2 rounded-xl text-xs"
            >
              📋 Programma
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center pt-16">
            <div className="text-5xl mb-4">⚽</div>
            <p className="text-slate-400">Nessuna partita ancora</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 bg-green-700 text-white font-bold px-6 py-3 rounded-xl"
            >
              Crea la prima partita
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map(match => (
              <div key={match.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="flex items-start justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[match.status]}`}>
                        {STATUS_LABEL[match.status]}
                      </span>
                      <span className="text-xs text-slate-500">{PHASE_LABEL[match.phase]}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">vs {match.opponent}</h3>
                    {match.scheduled_time && (
                      <p className="text-slate-400 text-xs mt-0.5">{formatTime(match.scheduled_time)}</p>
                    )}
                  </div>
                  {(match.status === 'live' || match.status === 'done') && (
                    <div className="text-right ml-3">
                      <span className="text-3xl font-black text-white font-mono">
                        {match.score_us}–{match.score_them}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex border-t border-slate-700">
                  {match.status === 'planned' && (
                    <>
                      <Link
                        href={`/match/${match.id}/plan`}
                        className="flex-1 py-3 text-center text-sm font-semibold text-blue-400 active:bg-slate-700"
                      >
                        ✏️ Modifica
                      </Link>
                      <button
                        onClick={() => router.push(`/match/${match.id}/lineup`)}
                        className="flex-1 py-3 text-center text-sm font-bold text-green-400 active:bg-slate-700 border-l border-slate-700"
                      >
                        ▶ Inizia
                      </button>
                    </>
                  )}
                  {match.status === 'pending' && (
                    <Link
                      href={`/match/${match.id}/lineup`}
                      className="flex-1 py-3 text-center text-sm font-semibold text-green-400 active:bg-slate-700"
                    >
                      Formazione →
                    </Link>
                  )}
                  {match.status === 'live' && (
                    <Link
                      href={`/match/${match.id}/live`}
                      className="flex-1 py-3 text-center text-sm font-bold text-red-400 active:bg-slate-700"
                    >
                      LIVE →
                    </Link>
                  )}
                  {match.status === 'done' && (
                    <Link
                      href={`/match/${match.id}/summary`}
                      className="flex-1 py-3 text-center text-sm font-semibold text-slate-300 active:bg-slate-700"
                    >
                      Riepilogo
                    </Link>
                  )}
                  {match.status !== 'live' && (
                    <button
                      onClick={() => { setDeleteTarget(match); setDeleteStep(1) }}
                      className="px-5 py-3 text-red-500 text-sm border-l border-slate-700 active:bg-slate-700 active:text-red-400"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewMatchModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={handleCreateMatch}
      />

      <NewMatchModal
        isOpen={showPlan}
        title="Pianifica Partita"
        submitLabel="📋 Pianifica"
        onClose={() => setShowPlan(false)}
        onSubmit={handleCreatePlan}
      />

      {/* Step 1: first confirm for all matches */}
      <ConfirmDialog
        isOpen={!!deleteTarget && deleteStep === 1}
        title="Elimina partita"
        message={`Sei sicuro di voler eliminare la partita contro ${deleteTarget?.opponent}?`}
        confirmLabel="Continua"
        danger
        onConfirm={() => {
          if (deleteTarget?.status === 'done') {
            setDeleteStep(2)
          } else {
            handleDelete()
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Step 2: second confirm only for completed matches */}
      <ConfirmDialog
        isOpen={!!deleteTarget && deleteStep === 2}
        title="ATTENZIONE"
        message={`Questa partita è già stata giocata (${deleteTarget?.score_us}–${deleteTarget?.score_them} vs ${deleteTarget?.opponent}). Eliminando perderai tutti i dati degli eventi. Confermi?`}
        confirmLabel="ELIMINA DEFINITIVAMENTE"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <NavBar />
    </div>
  )
}
