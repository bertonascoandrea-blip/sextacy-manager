'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { OPPONENT_TEAMS, PHASES } from '@/lib/constants'
import type { Player, MatchPhase } from '@/lib/types'

const TOURNAMENT_DATE = '2026-06-06'

interface PlayerSeasonStats {
  goals: number
  assists: number
  yellows: number
  minutes: number
}

interface PlayerPlanState {
  isStarter: boolean
  isCaptain: boolean
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [opponentSelect, setOpponentSelect] = useState('')
  const [opponentCustom, setOpponentCustom] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [halfDuration, setHalfDuration] = useState(12)
  const [phase, setPhase] = useState<MatchPhase>('girone')
  const [notes, setNotes] = useState('')

  const [players, setPlayers] = useState<Player[]>([])
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerPlanState>>({})
  const [seasonStats, setSeasonStats] = useState<Record<string, PlayerSeasonStats>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const sb = getSupabase()

    const [
      { data: matchData },
      { data: playersData },
      { data: lineupData },
      { data: doneMatches },
    ] = await Promise.all([
      sb.from('matches').select('*').eq('id', id).single(),
      sb.from('players').select('*').order('name'),
      sb.from('match_lineups').select('*').eq('match_id', id),
      sb.from('matches').select('id, half_duration_mins').eq('status', 'done'),
    ])

    if (matchData) {
      const opp: string = matchData.opponent ?? ''
      const inList = OPPONENT_TEAMS.includes(opp)
      setOpponentSelect(inList ? opp : (opp ? '__custom__' : ''))
      setOpponentCustom(inList ? '' : opp)
      if (matchData.scheduled_time) {
        const d = new Date(matchData.scheduled_time)
        setTimeValue(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        )
      }
      setHalfDuration(matchData.half_duration_mins ?? 12)
      setPhase(matchData.phase ?? 'girone')
      setNotes(matchData.notes ?? '')
    }

    const squadPlayers: Player[] = (playersData as Player[]) ?? []
    setPlayers(squadPlayers)

    if (lineupData && lineupData.length > 0) {
      const states: Record<string, PlayerPlanState> = {}
      ;(lineupData as { player_id: string; is_captain: boolean }[]).forEach(l => {
        states[l.player_id] = { isStarter: true, isCaptain: l.is_captain }
      })
      setPlayerStates(states)
    }

    const doneMatchIds: string[] = (doneMatches ?? []).map((m: { id: string }) => m.id)

    if (doneMatchIds.length > 0) {
      const [{ data: eventsData }, { data: seasonLineups }] = await Promise.all([
        sb.from('events').select('type, player_id, match_id').in('match_id', doneMatchIds),
        sb.from('match_lineups').select('player_id, match_id').in('match_id', doneMatchIds),
      ])

      const stats: Record<string, PlayerSeasonStats> = {}
      squadPlayers.forEach(player => {
        const pev = (eventsData ?? []).filter((e: { player_id: string }) => e.player_id === player.id)
        const pli = (seasonLineups ?? []).filter((l: { player_id: string }) => l.player_id === player.id)
        const minutes = pli.reduce((sum: number, l: { match_id: string }) => {
          const m = (doneMatches ?? []).find((dm: { id: string }) => dm.id === l.match_id) as
            | { half_duration_mins: number }
            | undefined
          return sum + (m ? m.half_duration_mins * 2 : 0)
        }, 0)
        stats[player.id] = {
          goals: pev.filter((e: { type: string }) => e.type === 'goal').length,
          assists: pev.filter((e: { type: string }) => e.type === 'assist').length,
          yellows: pev.filter((e: { type: string }) => e.type === 'yellow').length,
          minutes,
        }
      })
      setSeasonStats(stats)
    }

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const toggleStarter = (playerId: string) => {
    setPlayerStates(prev => {
      const curr = prev[playerId] ?? { isStarter: false, isCaptain: false }
      const next = !curr.isStarter
      return { ...prev, [playerId]: { isStarter: next, isCaptain: next ? curr.isCaptain : false } }
    })
  }

  const toggleCaptain = (playerId: string) => {
    setPlayerStates(prev => {
      const isCap = prev[playerId]?.isCaptain ?? false
      const next: Record<string, PlayerPlanState> = {}
      Object.keys(prev).forEach(pid => { next[pid] = { ...prev[pid], isCaptain: false } })
      if (!isCap) next[playerId] = { ...next[playerId], isCaptain: true }
      return next
    })
  }

  const handleSave = async (redirect: boolean) => {
    const finalOpponent = opponentSelect === '__custom__' ? opponentCustom : opponentSelect
    if (!finalOpponent.trim()) {
      showToast('Seleziona un avversario', 'error')
      return
    }
    setSaving(true)
    const sb = getSupabase()

    const scheduledTime = timeValue ? `${TOURNAMENT_DATE}T${timeValue}:00+02:00` : null

    const { error: matchErr } = await sb
      .from('matches')
      .update({
        opponent: finalOpponent.trim(),
        scheduled_time: scheduledTime,
        half_duration_mins: halfDuration,
        phase,
        notes: notes.trim() || null,
      })
      .eq('id', id)

    if (matchErr) {
      showToast('Errore aggiornamento partita', 'error')
      setSaving(false)
      return
    }

    await sb.from('match_lineups').delete().eq('match_id', id)

    const starterIds = Object.entries(playerStates)
      .filter(([, s]) => s.isStarter)
      .map(([pid]) => pid)

    if (starterIds.length > 0) {
      await sb.from('match_lineups').insert(
        starterIds.map(pid => ({
          match_id: id,
          player_id: pid,
          is_captain: playerStates[pid]?.isCaptain ?? false,
          is_starter: true,
        }))
      )
    }

    showToast('Bozza salvata!', 'success')
    setSaving(false)
    if (redirect) router.push('/')
  }

  const finalOpponent = opponentSelect === '__custom__' ? opponentCustom : opponentSelect
  const starterCount = Object.values(playerStates).filter(s => s.isStarter).length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-32">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-slate-400 text-2xl leading-none w-8 flex-shrink-0">
            ‹
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white">Pianifica Partita</h1>
            <p className="text-slate-400 text-xs truncate">
              {finalOpponent ? `vs ${finalOpponent}` : 'Seleziona avversario'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">

        {/* Match info */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">📋 Partita</h2>

          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1.5 block">Avversario</label>
            <select
              value={opponentSelect}
              onChange={e => setOpponentSelect(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
            >
              <option value="">Seleziona squadra...</option>
              {OPPONENT_TEAMS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom__">Altro (inserisci)</option>
            </select>
          </div>

          {opponentSelect === '__custom__' && (
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1.5 block">Nome avversario</label>
              <input
                type="text"
                value={opponentCustom}
                onChange={e => setOpponentCustom(e.target.value)}
                placeholder="Nome squadra..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm placeholder-slate-500"
              />
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1.5 block">Orario</label>
              <input
                type="time"
                value={timeValue}
                onChange={e => setTimeValue(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1.5 block">Fase</label>
              <select
                value={phase}
                onChange={e => setPhase(e.target.value as MatchPhase)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
              >
                {PHASES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Durata tempo (min)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHalfDuration(d => Math.max(1, d - 1))}
                className="w-12 h-12 bg-slate-700 active:bg-slate-600 rounded-xl text-white text-xl font-bold"
              >
                −
              </button>
              <span className="flex-1 text-center text-2xl font-bold text-white">{halfDuration}</span>
              <button
                type="button"
                onClick={() => setHalfDuration(d => Math.min(30, d + 1))}
                className="w-12 h-12 bg-slate-700 active:bg-slate-600 rounded-xl text-white text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* Lineup */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🏃 Formazione</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              starterCount === 0 ? 'bg-slate-700 text-slate-400' : 'bg-green-800/60 text-green-300'
            }`}>
              {starterCount} titolari
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {players.map(player => {
              const state = playerStates[player.id] ?? { isStarter: false, isCaptain: false }
              const stats = seasonStats[player.id] ?? { goals: 0, assists: 0, yellows: 0, minutes: 0 }

              return (
                <div
                  key={player.id}
                  className={`border rounded-2xl p-3 flex items-center gap-3 ${
                    state.isStarter
                      ? 'bg-green-900/20 border-green-800'
                      : 'bg-slate-700/20 border-slate-700'
                  }`}
                >
                  {/* Titolare toggle */}
                  <button
                    onClick={() => toggleStarter(player.id)}
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors ${
                      state.isStarter
                        ? 'border-green-500 bg-green-600 text-white'
                        : 'border-slate-600 bg-slate-700 text-transparent'
                    }`}
                  >
                    ✓
                  </button>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-sm leading-snug ${
                        state.isStarter ? 'text-white' : 'text-slate-400'
                      }`}>
                        {player.name}
                      </span>
                      {state.isCaptain && <span className="text-yellow-400 text-xs">👑</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                      <span className="text-slate-500 uppercase font-bold">
                        {player.role === 'portiere' ? 'POR' : 'CAM'}
                      </span>
                      <span className="text-slate-500">⚽{stats.goals}</span>
                      <span className="text-slate-500">🎯{stats.assists}</span>
                      <span className="text-slate-500">🟨{stats.yellows}</span>
                      <span className="text-slate-500">{stats.minutes}&apos;</span>
                    </div>
                  </div>

                  {/* Captain toggle (visible only when starter) */}
                  {state.isStarter && (
                    <button
                      onClick={() => toggleCaptain(player.id)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-colors ${
                        state.isCaptain
                          ? 'bg-yellow-500 text-black'
                          : 'bg-slate-700 text-slate-500 active:bg-slate-600'
                      }`}
                    >
                      👑
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Tactical notes */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📝 Note tattiche</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Schemi, istruzioni difensive, strategie di pressing..."
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-green-500"
          />
        </section>

        {/* Action buttons */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 h-14 bg-slate-700 active:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl text-white font-bold text-sm"
          >
            {saving ? '...' : '💾 Salva Bozza'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 h-14 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-2xl text-white font-bold text-sm"
          >
            {saving ? '...' : '✅ Conferma'}
          </button>
        </div>
      </main>
    </div>
  )
}
