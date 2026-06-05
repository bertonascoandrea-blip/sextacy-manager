'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import type { Match, MatchEvent, Player } from '@/lib/types'

type EventType = 'goal' | 'goal_opp' | 'yellow' | 'red' | 'sub' | 'assist'

interface PickerState {
  type: EventType
  // 'player' = any on-field player; 'enter' = sub: who comes in; 'exit' = sub: who goes out
  step: 'player' | 'enter' | 'exit'
  playerInId: string | null
}

const EVENT_BUTTONS: { type: EventType; label: string; color: string }[] = [
  { type: 'goal',     label: '⚽ Goal Noi',  color: 'bg-green-700 active:bg-green-800' },
  { type: 'goal_opp', label: '⚽ Goal Loro', color: 'bg-red-700 active:bg-red-800' },
  { type: 'yellow',   label: '🟨 Giallo',    color: 'bg-yellow-600 active:bg-yellow-700' },
  { type: 'red',      label: '🟥 Rosso',     color: 'bg-red-600 active:bg-red-700' },
  { type: 'sub',      label: '🔄 Cambio',    color: 'bg-slate-600 active:bg-slate-500' },
  { type: 'assist',   label: '🎯 Assist',    color: 'bg-blue-700 active:bg-blue-800' },
]

const EVENT_LOG_LABEL: Record<EventType, string> = {
  goal:     '⚽ GOAL',
  goal_opp: '⚽ GOL AVV.',
  assist:   '🎯 Assist',
  yellow:   '🟨 Giallo',
  red:      '🟥 Rosso',
  sub:      '🔄 Cambio',
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  // Match data
  const [match, setMatch] = useState<Match | null>(null)
  const [squadPlayers, setSquadPlayers] = useState<Player[]>([])
  const [onFieldIds, setOnFieldIds] = useState<Set<string>>(new Set())
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [scoreUs, setScoreUs] = useState(0)
  const [scoreThem, setScoreThem] = useState(0)
  const [loading, setLoading] = useState(true)

  // Timer: countdown from halfDuration * 60 seconds
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [half, setHalf] = useState(1)
  const [halfBetween, setHalfBetween] = useState(false)

  // UI state
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [endConfirm, setEndConfirm] = useState<1 | 2 | null>(null)

  // Derived values
  const halfDuration = match?.half_duration_mins ?? 12
  const elapsedSecsInHalf = Math.max(0, halfDuration * 60 - remainingSeconds)
  const totalElapsedMins = (half === 2 ? halfDuration : 0) + Math.floor(elapsedSecsInHalf / 60)
  const timerExpired = remainingSeconds === 0 && !loading

  // ─── Timer via useEffect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          setIsRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // ─── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      const sb = getSupabase()
      const [{ data: matchData }, { data: lineupData }, { data: eventsData }, { data: allPlayersData }] = await Promise.all([
        sb.from('matches').select('*').eq('id', id).single(),
        sb.from('match_lineups').select('*, player:players(*)').eq('match_id', id),
        sb.from('events')
          .select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)')
          .eq('match_id', id)
          .order('created_at'),
        sb.from('players').select('*').order('name'),
      ])

      if (matchData) {
        setMatch(matchData)
        setScoreUs(matchData.score_us)
        setScoreThem(matchData.score_them)
        setRemainingSeconds(matchData.half_duration_mins * 60)
      }

      // Always load full squad (all 7 players) so bench players are always available
      if (allPlayersData) setSquadPlayers(allPlayersData as Player[])

      if (lineupData) {
        // On-field = starters only (is_starter: true). Apply any subs already recorded.
        const ids = new Set(
          lineupData
            .filter((l: { is_starter: boolean }) => l.is_starter)
            .map((l: { player_id: string }) => l.player_id)
        )
        if (eventsData) {
          eventsData
            .filter((e: { type: string }) => e.type === 'sub')
            .forEach((e: { player_id: string | null; player_out_id: string | null }) => {
              if (e.player_out_id) ids.delete(e.player_out_id)
              if (e.player_id) ids.add(e.player_id)
            })
        }
        setOnFieldIds(ids)

        const cap = lineupData.find((l: { is_captain: boolean }) => l.is_captain)
        if (cap) setCaptainId((cap as { player_id: string }).player_id)
      }

      if (eventsData) setEvents(eventsData as MatchEvent[])
      setLoading(false)
    }
    loadData()
  }, [id])

  // ─── Timer controls ──────────────────────────────────────────────────────
  const startTimer = () => {
    if (isRunning || remainingSeconds === 0) return
    setIsRunning(true)
  }

  const stopTimer = () => setIsRunning(false)

  const resetTimer = () => {
    setIsRunning(false)
    setRemainingSeconds(halfDuration * 60)
  }

  const endHalf = () => {
    setIsRunning(false)
    if (half === 1) {
      setHalfBetween(true)
    } else {
      setEndConfirm(1)
    }
  }

  const startSecondHalf = () => {
    setHalf(2)
    setHalfBetween(false)
    setRemainingSeconds(halfDuration * 60)
    setIsRunning(true)
  }

  // ─── Current match minute for event recording ────────────────────────────
  const currentMinute = () => {
    const elapsedSecs = halfDuration * 60 - remainingSeconds
    return (half === 2 ? halfDuration : 0) + Math.floor(elapsedSecs / 60)
  }

  // ─── Event handling ──────────────────────────────────────────────────────
  const openPicker = (type: EventType) => {
    if (type === 'goal_opp') {
      handleGoalOpp()
      return
    }
    setPicker({
      type,
      step: type === 'sub' ? 'enter' : 'player',
      playerInId: null,
    })
  }

  const handleGoalOpp = async () => {
    const sb = getSupabase()
    const { data: newEvent, error } = await sb
      .from('events')
      .insert({ match_id: id, minute: currentMinute(), type: 'goal_opp', player_id: null, player_out_id: null })
      .select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)')
      .single()
    if (error) { showToast('Errore salvataggio', 'error'); return }
    setEvents(prev => [...prev, newEvent as MatchEvent])
    const newThem = scoreThem + 1
    setScoreThem(newThem)
    await sb.from('matches').update({ score_them: newThem }).eq('id', id)
    showToast('⚽ Goal avversario', 'info')
  }

  const handlePlayerSelect = async (playerId: string) => {
    if (!picker) return

    // Sub step 1: pick who enters (from bench)
    if (picker.type === 'sub' && picker.step === 'enter') {
      setPicker({ ...picker, step: 'exit', playerInId: playerId })
      return
    }

    // All other events + sub step 2
    const playerInId  = picker.type === 'sub' ? picker.playerInId : playerId
    const playerOutId = picker.type === 'sub' ? playerId : null
    const minute = currentMinute()

    const sb = getSupabase()
    const { data: newEvent, error } = await sb
      .from('events')
      .insert({ match_id: id, minute, type: picker.type, player_id: playerInId, player_out_id: playerOutId })
      .select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)')
      .single()

    if (error) { showToast('Errore salvataggio evento', 'error'); setPicker(null); return }

    setEvents(prev => [...prev, newEvent as MatchEvent])

    if (picker.type === 'goal') {
      const newUs = scoreUs + 1
      setScoreUs(newUs)
      await sb.from('matches').update({ score_us: newUs }).eq('id', id)
    }

    // Update on-field tracking for substitution
    if (picker.type === 'sub' && playerInId && playerOutId) {
      setOnFieldIds(prev => {
        const next = new Set(prev)
        next.delete(playerOutId)
        next.add(playerInId)
        return next
      })
    }

    showToast(`${EVENT_LOG_LABEL[picker.type]} registrato!`, 'success')
    setPicker(null)
  }

  const handleEndMatch = async () => {
    setIsRunning(false)
    const sb = getSupabase()
    await sb.from('matches').update({ status: 'done', score_us: scoreUs, score_them: scoreThem }).eq('id', id)
    showToast('Partita terminata!', 'success')
    router.push(`/match/${id}/summary`)
  }

  // ─── Player live stats helpers ───────────────────────────────────────────
  const getPlayerMinutes = (playerId: string): number => {
    if (onFieldIds.has(playerId)) {
      const lastSubIn = [...events].reverse().find(e => e.type === 'sub' && e.player_id === playerId)
      return Math.max(0, totalElapsedMins - (lastSubIn?.minute ?? 0))
    } else {
      const lastSubOut = [...events].reverse().find(e => e.type === 'sub' && e.player_out_id === playerId)
      return lastSubOut?.minute ?? 0
    }
  }

  const countEvents = (pid: string, type: EventType) =>
    events.filter(e => e.type === type && e.player_id === pid).length

  // ─── Timer display ────────────────────────────────────────────────────────
  const timerMins = Math.floor(remainingSeconds / 60)
  const timerSecs = remainingSeconds % 60
  const timerStr  = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`

  // ─── Picker helpers ───────────────────────────────────────────────────────
  const fieldPlayers = squadPlayers.filter(p => onFieldIds.has(p.id))
  const benchPlayers = squadPlayers.filter(p => !onFieldIds.has(p.id))

  const pickerTitle = (): string => {
    if (!picker) return ''
    if (picker.type === 'sub') return picker.step === 'enter' ? '🔄 Chi entra?' : '🔄 Chi esce?'
    return EVENT_LOG_LABEL[picker.type]
  }

  const pickerList = (): Player[] => {
    if (!picker) return []
    if (picker.step === 'enter') return benchPlayers
    if (picker.step === 'exit')  return fieldPlayers.filter(p => p.id !== picker.playerInId)
    return fieldPlayers
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const onFieldList  = squadPlayers.filter(p => onFieldIds.has(p.id))
  const benchList    = squadPlayers.filter(p => !onFieldIds.has(p.id))

  return (
    <div className="min-h-screen bg-slate-900 pb-10 select-none">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium">Sextacy vs</p>
            <h1 className="text-2xl font-black text-white leading-tight">{match?.opponent}</h1>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            halfBetween
              ? 'bg-slate-700 text-slate-300'
              : half === 1
                ? 'bg-green-800 text-green-200'
                : 'bg-blue-800 text-blue-200'
          }`}>
            {halfBetween ? 'PAUSA' : `${half}° TEMPO`}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4">

        {/* ── SCORE ──────────────────────────────────────────────────────── */}
        <div className="text-center pt-5 pb-1">
          <div className="text-[80px] font-black text-white font-mono tracking-tight leading-none">
            {scoreUs}–{scoreThem}
          </div>
        </div>

        {/* ── TIMER ──────────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <div className={`timer-display font-mono font-bold leading-none ${
            timerExpired
              ? 'text-red-400 animate-pulse text-6xl'
              : isRunning
                ? 'text-green-400 text-7xl'
                : 'text-slate-400 text-7xl'
          }`}>
            {timerStr}
          </div>
          {timerExpired && (
            <p className="text-red-400 text-xs font-bold mt-1 tracking-widest animate-pulse">
              TEMPO SCADUTO
            </p>
          )}
        </div>

        {/* ── AVVIA / STOP ───────────────────────────────────────────────── */}
        {!halfBetween && (
          <>
            <div className="flex gap-3 mb-3">
              <button
                onClick={startTimer}
                disabled={isRunning || timerExpired}
                className="flex-1 h-16 bg-green-700 active:bg-green-800 disabled:bg-slate-700 disabled:text-slate-500 rounded-2xl text-white font-black text-xl"
              >
                ▶ AVVIA
              </button>
              <button
                onClick={stopTimer}
                disabled={!isRunning}
                className="flex-1 h-16 bg-yellow-600 active:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-2xl text-white font-black text-xl"
              >
                ⏸ STOP
              </button>
            </div>

            <div className="flex gap-2 mb-5">
              <button
                onClick={resetTimer}
                className="flex-1 h-11 bg-slate-700 active:bg-slate-600 rounded-xl text-slate-300 font-semibold text-sm"
              >
                ↺ Reset
              </button>
              <button
                onClick={endHalf}
                className="flex-1 h-11 bg-slate-700 active:bg-slate-600 rounded-xl text-slate-300 font-semibold text-sm"
              >
                Fine {half}° Tempo
              </button>
            </div>
          </>
        )}

        {/* ── PAUSA TRA I TEMPI ──────────────────────────────────────────── */}
        {halfBetween && (
          <div className="bg-blue-900/40 border border-blue-700 rounded-2xl p-5 mb-5 text-center">
            <p className="text-blue-200 font-bold text-xl mb-1">Fine 1° Tempo</p>
            <p className="text-blue-300 text-sm mb-4 font-mono">
              {scoreUs} – {scoreThem}
            </p>
            <button
              onClick={startSecondHalf}
              className="w-full h-14 bg-blue-700 active:bg-blue-800 text-white font-black text-lg rounded-2xl"
            >
              Inizia 2° Tempo →
            </button>
          </div>
        )}

        {/* ── EVENT BUTTONS (2×3) ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {EVENT_BUTTONS.map(btn => (
            <button
              key={btn.type}
              onClick={() => openPicker(btn.type)}
              className={`${btn.color} text-white font-bold h-14 rounded-2xl text-sm`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── FINE PARTITA ───────────────────────────────────────────────── */}
        <button
          onClick={() => setEndConfirm(1)}
          className="w-full h-12 border border-red-800 text-red-400 font-bold rounded-2xl text-sm active:bg-red-900/20 mb-6"
        >
          Fine Partita
        </button>

        {/* ── LIVE PLAYER DASHBOARD ──────────────────────────────────────── */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            In campo ({onFieldList.length})
          </h2>
          <div className="flex flex-col gap-2">
            {onFieldList.map(player => {
              const mins    = getPlayerMinutes(player.id)
              const goals   = countEvents(player.id, 'goal')
              const assists = countEvents(player.id, 'assist')
              const yellows = countEvents(player.id, 'yellow')
              const reds    = countEvents(player.id, 'red')
              const isCap   = captainId === player.id
              return (
                <div key={player.id}
                  className="bg-slate-800 border border-green-900/50 rounded-xl px-3 py-2.5 flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-800 rounded-full flex items-center justify-center
                                  text-white font-bold text-sm flex-shrink-0">
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white text-sm font-semibold leading-none">{player.name}</span>
                      {isCap && <span className="text-yellow-400 text-xs">©</span>}
                      {player.role === 'portiere' && (
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-700 px-1 rounded">POR</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-slate-400 text-xs font-mono">{mins}&apos;</span>
                      {goals   > 0 && <span className="text-green-400 text-xs font-bold">⚽ {goals}</span>}
                      {assists > 0 && <span className="text-blue-400 text-xs font-bold">🎯 {assists}</span>}
                      {yellows === 1 && (
                        <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">1🟨</span>
                      )}
                      {yellows >= 2 && (
                        <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded animate-pulse">
                          2🟨 SQUALIFICA
                        </span>
                      )}
                      {reds > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">🟥 ESP</span>
                      )}
                    </div>
                  </div>
                  <span className="text-green-400 text-[10px] font-bold flex-shrink-0">● IN CAMPO</span>
                </div>
              )
            })}
          </div>

          {benchList.length > 0 && (
            <>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">
                Panchina ({benchList.length})
              </h2>
              <div className="flex flex-col gap-2">
                {benchList.map(player => {
                  const mins    = getPlayerMinutes(player.id)
                  const goals   = countEvents(player.id, 'goal')
                  const assists = countEvents(player.id, 'assist')
                  const yellows = countEvents(player.id, 'yellow')
                  const reds    = countEvents(player.id, 'red')
                  return (
                    <div key={player.id}
                      className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 flex items-center gap-3 opacity-65">
                      <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center
                                      text-slate-400 font-bold text-sm flex-shrink-0">
                        {player.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-300 text-sm font-medium block leading-none">{player.name}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {mins > 0 && <span className="text-slate-500 text-xs font-mono">{mins}&apos; giocati</span>}
                          {goals   > 0 && <span className="text-green-400 text-xs">⚽ {goals}</span>}
                          {assists > 0 && <span className="text-blue-400 text-xs">🎯 {assists}</span>}
                          {yellows === 1 && (
                            <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">1🟨</span>
                          )}
                          {yellows >= 2 && (
                            <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded">2🟨!</span>
                          )}
                          {reds > 0 && (
                            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">🟥</span>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-600 text-[10px] font-bold flex-shrink-0">PANCHINA</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── EVENT LOG ──────────────────────────────────────────────────── */}
        {events.length > 0 && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cronaca</h2>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {[...events].reverse().map(ev => (
                <div key={ev.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 w-8 flex-shrink-0">{ev.minute}&apos;</span>
                  <span className="text-xs text-slate-200 leading-snug">
                    {EVENT_LOG_LABEL[ev.type as EventType]}
                    {ev.player     && ` — ${(ev.player as Player).name}`}
                    {ev.player_out && ` ↔ ${(ev.player_out as Player).name}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── PLAYER PICKER BOTTOM SHEET ─────────────────────────────────── */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75">
          <div className="w-full max-w-lg mx-auto bg-slate-800 rounded-t-3xl border-t border-slate-700
                          p-4 pb-10 max-h-[72vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{pickerTitle()}</h3>
              <button
                onClick={() => setPicker(null)}
                className="w-10 h-10 text-slate-400 text-2xl flex items-center justify-center rounded-full"
              >
                ×
              </button>
            </div>

            {pickerList().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Nessun giocatore disponibile</p>
                <p className="text-slate-500 text-xs mt-1">
                  {picker.step === 'enter' ? 'Tutti in campo' : 'Nessuno in campo'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pickerList().map(player => {
                  const goals   = countEvents(player.id, 'goal')
                  const yellows = countEvents(player.id, 'yellow')
                  const mins    = getPlayerMinutes(player.id)
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerSelect(player.id)}
                      className="flex items-center gap-3 bg-slate-700 active:bg-slate-600 rounded-2xl px-4 py-4 text-left"
                    >
                      <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center
                                      text-white font-bold flex-shrink-0">
                        {player.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{player.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          {player.role === 'portiere' && <span>POR</span>}
                          <span>{mins}&apos;</span>
                          {goals   > 0 && <span className="text-green-400">⚽{goals}</span>}
                          {yellows > 0 && <span className="text-yellow-400">🟨{yellows}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOUBLE CONFIRM END MATCH ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={endConfirm === 1}
        title="Terminare la partita?"
        message="Sei sicuro? Questa azione richiede una seconda conferma."
        confirmLabel="Continua"
        danger
        onConfirm={() => setEndConfirm(2)}
        onCancel={() => setEndConfirm(null)}
      />
      <ConfirmDialog
        isOpen={endConfirm === 2}
        title="Conferma definitiva"
        message={`Terminare con ${scoreUs}–${scoreThem}? Il live si chiuderà definitivamente.`}
        confirmLabel="TERMINA PARTITA"
        danger
        onConfirm={() => { setEndConfirm(null); handleEndMatch() }}
        onCancel={() => setEndConfirm(null)}
      />
    </div>
  )
}
