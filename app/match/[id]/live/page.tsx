'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import type { Match, MatchEvent, Player } from '@/lib/types'

type EventType = 'goal' | 'goal_opp' | 'yellow' | 'red' | 'sub' | 'assist'

interface ActivePlayer {
  player: Player
  isCaptain: boolean
}

interface EventPickerState {
  type: EventType
  needsPlayerOut: boolean
}

const EVENT_BUTTONS: { type: EventType; label: string; color: string }[] = [
  { type: 'goal', label: '⚽ Goal Noi', color: 'bg-green-700 active:bg-green-800' },
  { type: 'goal_opp', label: '⚽ Goal Loro', color: 'bg-red-700 active:bg-red-800' },
  { type: 'assist', label: '👟 Assist', color: 'bg-blue-700 active:bg-blue-800' },
  { type: 'yellow', label: '🟨 Giallo', color: 'bg-yellow-600 active:bg-yellow-700' },
  { type: 'red', label: '🟥 Rosso', color: 'bg-red-600 active:bg-red-700' },
  { type: 'sub', label: '🔄 Cambio', color: 'bg-slate-600 active:bg-slate-500' },
]

const EVENT_LOG_LABEL: Record<EventType, string> = {
  goal: '⚽ GOAL',
  goal_opp: '⚽ GOL AVVERSARIO',
  assist: '👟 Assist',
  yellow: '🟨 Giallo',
  red: '🟥 Rosso',
  sub: '🔄 Cambio',
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [match, setMatch] = useState<Match | null>(null)
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Timer state
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [half, setHalf] = useState(1)
  const [halfEnded, setHalfEnded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Score state
  const [scoreUs, setScoreUs] = useState(0)
  const [scoreThem, setScoreThem] = useState(0)

  // Event picker
  const [picker, setPicker] = useState<EventPickerState | null>(null)
  const [pickerStep, setPickerStep] = useState<'player' | 'player_out'>('player')
  const [selectedPlayerIn, setSelectedPlayerIn] = useState<string | null>(null)

  // Confirm end match
  const [showEndConfirm1, setShowEndConfirm1] = useState(false)
  const [showEndConfirm2, setShowEndConfirm2] = useState(false)

  useEffect(() => {
    loadData()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [id])

  const loadData = async () => {
    const sb = getSupabase()
    const [{ data: matchData }, { data: lineupData }, { data: eventsData }] = await Promise.all([
      sb.from('matches').select('*').eq('id', id).single(),
      sb.from('match_lineups').select('*, player:players(*)').eq('match_id', id),
      sb.from('events').select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)').eq('match_id', id).order('minute'),
    ])

    if (matchData) {
      setMatch(matchData)
      setScoreUs(matchData.score_us)
      setScoreThem(matchData.score_them)
    }
    if (lineupData) {
      const active: ActivePlayer[] = lineupData.map((l: { player: Player; is_captain: boolean }) => ({
        player: l.player,
        isCaptain: l.is_captain,
      }))
      setActivePlayers(active)
    }
    if (eventsData) {
      setEvents(eventsData as MatchEvent[])
    }
    setLoading(false)
  }

  const currentMinute = useCallback(() => {
    const base = half === 2 ? (match?.half_duration_mins ?? 12) : 0
    return base + Math.floor(seconds / 60)
  }, [seconds, half, match])

  const startTimer = () => {
    if (isRunning) return
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  const stopTimer = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resetTimer = () => {
    stopTimer()
    setSeconds(0)
  }

  const startSecondHalf = () => {
    setHalf(2)
    setHalfEnded(false)
    setSeconds(0)
    startTimer()
  }

  const handleHalfEnd = () => {
    stopTimer()
    if (half === 1) {
      setHalfEnded(true)
    } else {
      setShowEndConfirm1(true)
    }
  }

  const timerDisplay = () => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const openPicker = (type: EventType) => {
    const needsPlayerOut = type === 'sub'
    setPicker({ type, needsPlayerOut })
    setPickerStep('player')
    setSelectedPlayerIn(null)
  }

  const handlePlayerSelect = async (playerId: string) => {
    if (!picker) return

    if (picker.needsPlayerOut && pickerStep === 'player') {
      setSelectedPlayerIn(playerId)
      setPickerStep('player_out')
      return
    }

    const playerOutId = picker.needsPlayerOut ? playerId : null
    const playerInId = picker.needsPlayerOut ? selectedPlayerIn : playerId
    const minute = currentMinute()

    const sb = getSupabase()
    const payload: Record<string, unknown> = {
      match_id: id,
      minute,
      type: picker.type,
      player_id: picker.type === 'goal_opp' ? null : playerInId,
      player_out_id: playerOutId,
    }

    const { data: newEvent, error } = await sb
      .from('events')
      .insert(payload)
      .select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)')
      .single()

    if (error) {
      showToast('Errore salvataggio evento', 'error')
      setPicker(null)
      return
    }

    setEvents(prev => [...prev, newEvent as MatchEvent])

    // Update score
    let newUs = scoreUs
    let newThem = scoreThem

    if (picker.type === 'goal') newUs += 1
    if (picker.type === 'goal_opp') newThem += 1

    if (picker.type === 'goal' || picker.type === 'goal_opp') {
      setScoreUs(newUs)
      setScoreThem(newThem)
      await sb.from('matches').update({ score_us: newUs, score_them: newThem }).eq('id', id)
    }

    // Handle sub: swap players in active list
    if (picker.type === 'sub' && selectedPlayerIn && playerOutId) {
      setActivePlayers(prev =>
        prev.filter(ap => ap.player.id !== playerOutId)
      )
    }

    showToast(`${EVENT_LOG_LABEL[picker.type]} registrato!`, 'success')
    setPicker(null)
    setSelectedPlayerIn(null)
  }

  const handleEndMatch = async () => {
    stopTimer()
    const sb = getSupabase()
    await sb.from('matches').update({
      status: 'done',
      score_us: scoreUs,
      score_them: scoreThem,
    }).eq('id', id)

    showToast('Partita terminata!', 'success')
    router.push(`/match/${id}/summary`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allPlayers = activePlayers.map(ap => ap.player)

  return (
    <div className="min-h-screen bg-slate-900 pb-6 select-none">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">vs</p>
            <h1 className="text-xl font-black text-white">{match?.opponent}</h1>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              half === 1 ? 'bg-green-800 text-green-200' : 'bg-blue-800 text-blue-200'
            }`}>
              {half}° Tempo
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4">
        {/* Score + Timer */}
        <div className="text-center py-6">
          <div className="text-7xl font-black text-white font-mono tracking-tight mb-2">
            {scoreUs}–{scoreThem}
          </div>

          <div className={`timer-display text-4xl font-mono mb-4 ${
            isRunning ? 'text-green-400' : 'text-slate-400'
          }`}>
            {timerDisplay()}
          </div>

          {/* Timer controls */}
          <div className="flex gap-2 justify-center mb-4">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="bg-green-700 active:bg-green-800 text-white font-bold px-6 py-3 rounded-xl text-sm min-w-[100px]"
              >
                ▶ Start
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className="bg-yellow-600 active:bg-yellow-700 text-white font-bold px-6 py-3 rounded-xl text-sm min-w-[100px]"
              >
                ⏸ Stop
              </button>
            )}
            <button
              onClick={resetTimer}
              className="bg-slate-700 active:bg-slate-600 text-white font-bold px-4 py-3 rounded-xl text-sm"
            >
              ↺ Reset
            </button>
            <button
              onClick={handleHalfEnd}
              className="bg-slate-700 active:bg-slate-600 text-white font-bold px-4 py-3 rounded-xl text-sm"
            >
              Fine {half}°
            </button>
          </div>

          {halfEnded && half === 1 && (
            <div className="bg-blue-900/40 border border-blue-700 rounded-2xl p-4 mb-4">
              <p className="text-blue-300 font-semibold mb-3">Fine 1° Tempo — Pausa</p>
              <button
                onClick={startSecondHalf}
                className="w-full bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl"
              >
                Inizia 2° Tempo
              </button>
            </div>
          )}
        </div>

        {/* Event buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {EVENT_BUTTONS.map(btn => (
            <button
              key={btn.type}
              onClick={() => openPicker(btn.type)}
              className={`${btn.color} text-white font-bold py-4 rounded-2xl text-sm`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* End match button */}
        <button
          onClick={() => setShowEndConfirm1(true)}
          className="w-full py-4 border border-red-700 text-red-400 font-bold rounded-2xl text-sm active:bg-red-900/20 mb-6"
        >
          Fine Partita
        </button>

        {/* Events log */}
        {events.length > 0 && (
          <div>
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Cronaca
            </h2>
            <div className="flex flex-col gap-2">
              {[...events].reverse().map(ev => (
                <div key={ev.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-xs font-mono text-slate-400 w-8 flex-shrink-0">
                    {ev.minute}&apos;
                  </span>
                  <span className="text-xs text-slate-200 flex-1">
                    {EVENT_LOG_LABEL[ev.type as EventType]}
                    {ev.player && ` — ${(ev.player as Player).name}`}
                    {ev.player_out && ` ↔ ${(ev.player_out as Player).name}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Player picker modal */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70">
          <div className="w-full bg-slate-800 rounded-t-3xl border-t border-slate-700 p-4 pb-8 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {EVENT_LOG_LABEL[picker.type]}
                </h3>
                {picker.needsPlayerOut && (
                  <p className="text-slate-400 text-sm">
                    {pickerStep === 'player' ? 'Chi entra?' : 'Chi esce?'}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setPicker(null); setSelectedPlayerIn(null) }}
                className="text-slate-400 text-3xl leading-none w-10 h-10 flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            {picker.type === 'goal_opp' ? (
              <button
                onClick={() => handlePlayerSelect('')}
                className="w-full py-4 bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl"
              >
                Conferma Goal Avversario
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {allPlayers
                  .filter(p => {
                    if (picker.needsPlayerOut && pickerStep === 'player_out') {
                      return p.id !== selectedPlayerIn
                    }
                    return true
                  })
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerSelect(player.id)}
                      className="flex items-center gap-3 bg-slate-700 active:bg-slate-600 rounded-2xl px-4 py-4 text-left"
                    >
                      <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {player.name.charAt(0)}
                      </span>
                      <span className="text-white font-medium">{player.name}</span>
                      {player.role === 'portiere' && (
                        <span className="text-xs text-slate-400 ml-auto">POR</span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm end match - step 1 */}
      <ConfirmDialog
        isOpen={showEndConfirm1}
        title="Terminare la partita?"
        message="Sei sicuro di voler terminare la partita? Questa azione richiede una seconda conferma."
        confirmLabel="Sì, continua"
        danger
        onConfirm={() => { setShowEndConfirm1(false); setShowEndConfirm2(true) }}
        onCancel={() => setShowEndConfirm1(false)}
      />

      {/* Confirm end match - step 2 */}
      <ConfirmDialog
        isOpen={showEndConfirm2}
        title="Conferma definitiva"
        message={`Terminare la partita con risultato ${scoreUs}–${scoreThem}? Non potrai più modificare il live.`}
        confirmLabel="TERMINA PARTITA"
        danger
        onConfirm={() => { setShowEndConfirm2(false); handleEndMatch() }}
        onCancel={() => setShowEndConfirm2(false)}
      />
    </div>
  )
}
