'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import type { Match, MatchEvent, Player, MatchLineup } from '@/lib/types'

const EVENT_LABEL: Record<string, string> = {
  goal: '⚽ Goal',
  goal_opp: '⚽ Goal avv.',
  assist: '👟 Assist',
  yellow: '🟨 Giallo',
  red: '🟥 Rosso',
  sub: '🔄 Cambio',
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [match, setMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [lineup, setLineup] = useState<MatchLineup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    const sb = getSupabase()
    const [{ data: matchData }, { data: eventsData }, { data: lineupData }] = await Promise.all([
      sb.from('matches').select('*').eq('id', id).single(),
      sb.from('events')
        .select('*, player:players!events_player_id_fkey(*), player_out:players!events_player_out_id_fkey(*)')
        .eq('match_id', id)
        .order('minute'),
      sb.from('match_lineups').select('*, player:players(*)').eq('match_id', id),
    ])

    if (matchData) setMatch(matchData)
    if (eventsData) setEvents(eventsData as MatchEvent[])
    if (lineupData) setLineup(lineupData as MatchLineup[])
    setLoading(false)
  }

  const getPlayerMinutes = (playerId: string) => {
    const halfDur = match?.half_duration_mins ?? 12
    const totalMins = halfDur * 2
    const subOut = events.find(e => e.type === 'sub' && e.player_out_id === playerId)
    if (subOut) return subOut.minute
    const subIn = events.find(e => e.type === 'sub' && e.player_id === playerId)
    if (subIn) return totalMins - subIn.minute
    const wasInLineup = lineup.some(l => l.player_id === playerId && l.is_starter)
    return wasInLineup ? totalMins : 0
  }

  const getPlayerGoals = (playerId: string) =>
    events.filter(e => e.type === 'goal' && e.player_id === playerId).length

  const getPlayerAssists = (playerId: string) =>
    events.filter(e => e.type === 'assist' && e.player_id === playerId).length

  const getPlayerYellows = (playerId: string) =>
    events.filter(e => e.type === 'yellow' && e.player_id === playerId).length

  const getPlayerReds = (playerId: string) =>
    events.filter(e => e.type === 'red' && e.player_id === playerId).length

  const formatPhase: Record<string, string> = {
    girone: 'Girone', playoff: 'Playoff', quarti: 'Quarti',
    semi: 'Semifinale', finale: 'Finale',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-slate-400 text-2xl leading-none">‹</button>
          <div>
            <h1 className="text-lg font-bold text-white">Riepilogo</h1>
            {match && <p className="text-slate-400 text-xs">{formatPhase[match.phase]}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Score banner */}
        {match && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-center mb-4">
            <p className="text-slate-400 text-sm mb-1">Sextacy vs {match.opponent}</p>
            <div className="text-6xl font-black text-white font-mono mb-2">
              {match.score_us}–{match.score_them}
            </div>
            <p className={`text-sm font-bold ${
              match.score_us > match.score_them ? 'text-green-400' :
              match.score_us < match.score_them ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {match.score_us > match.score_them ? 'VITTORIA' :
               match.score_us < match.score_them ? 'SCONFITTA' : 'PAREGGIO'}
            </p>
          </div>
        )}

        {/* Player stats */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Statistiche Giocatori</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left px-4 py-2">Giocatore</th>
                  <th className="text-center px-2 py-2">Min</th>
                  <th className="text-center px-2 py-2">⚽</th>
                  <th className="text-center px-2 py-2">👟</th>
                  <th className="text-center px-2 py-2">🟨</th>
                  <th className="text-center px-2 py-2">🟥</th>
                </tr>
              </thead>
              <tbody>
                {lineup.map(l => {
                  const player = l.player as Player
                  const mins = getPlayerMinutes(player.id)
                  const goals = getPlayerGoals(player.id)
                  const assists = getPlayerAssists(player.id)
                  const yellows = getPlayerYellows(player.id)
                  const reds = getPlayerReds(player.id)
                  return (
                    <tr key={l.id} className="border-b border-slate-700/50">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{player.name}</span>
                        {l.is_captain && <span className="text-yellow-400 text-xs ml-1">©</span>}
                      </td>
                      <td className="text-center text-slate-300 px-2 py-3">{mins}&apos;</td>
                      <td className="text-center px-2 py-3">
                        {goals > 0 ? <span className="text-green-400 font-bold">{goals}</span> : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="text-center px-2 py-3">
                        {assists > 0 ? <span className="text-blue-400 font-bold">{assists}</span> : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="text-center px-2 py-3">
                        {yellows > 0 ? <span className="text-yellow-400 font-bold">{yellows}</span> : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="text-center px-2 py-3">
                        {reds > 0 ? <span className="text-red-400 font-bold">{reds}</span> : <span className="text-slate-600">0</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Events log */}
        {events.length > 0 && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 mb-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Cronaca</h2>
            <div className="flex flex-col gap-2">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-8">{ev.minute}&apos;</span>
                  <span className="text-xs text-slate-300">
                    {EVENT_LABEL[ev.type]}
                    {ev.player && ` — ${(ev.player as Player).name}`}
                    {ev.player_out && ` ↔ ${(ev.player_out as Player).name}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/players"
          className="block w-full py-3 bg-slate-700 active:bg-slate-600 rounded-2xl text-center text-white font-semibold text-sm"
        >
          Vedi statistiche giocatori →
        </Link>
      </main>

      <NavBar />
    </div>
  )
}
