'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import type { Player, Match } from '@/lib/types'

interface MatchStat {
  match: Match
  goals: number
  assists: number
  yellows: number
  reds: number
  minutes: number
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [player, setPlayer] = useState<Player | null>(null)
  const [matchStats, setMatchStats] = useState<MatchStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    const sb = getSupabase()

    const [{ data: playerData }, { data: eventsData }, { data: lineupData }] = await Promise.all([
      sb.from('players').select('*').eq('id', id).single(),
      sb.from('events').select('*, match:matches(*)').eq('player_id', id),
      sb.from('match_lineups').select('*, match:matches(*)').eq('player_id', id),
    ])

    if (!playerData) { setLoading(false); return }
    setPlayer(playerData)

    const matchMap = new Map<string, MatchStat>()

    ;(lineupData || []).forEach((l: { match: Match; match_id: string }) => {
      if (!l.match || l.match.status !== 'done') return
      const mins = l.match.half_duration_mins * 2
      if (!matchMap.has(l.match_id)) {
        matchMap.set(l.match_id, {
          match: l.match,
          goals: 0, assists: 0, yellows: 0, reds: 0,
          minutes: mins,
        })
      }
    })

    ;(eventsData || []).forEach((e: { match: Match; match_id: string; type: string }) => {
      if (!e.match || e.match.status !== 'done') return
      if (!matchMap.has(e.match_id)) {
        matchMap.set(e.match_id, {
          match: e.match,
          goals: 0, assists: 0, yellows: 0, reds: 0,
          minutes: e.match.half_duration_mins * 2,
        })
      }
      const stat = matchMap.get(e.match_id)!
      if (e.type === 'goal') stat.goals++
      if (e.type === 'assist') stat.assists++
      if (e.type === 'yellow') stat.yellows++
      if (e.type === 'red') stat.reds++
    })

    const stats = Array.from(matchMap.values()).sort(
      (a, b) => new Date(b.match.created_at).getTime() - new Date(a.match.created_at).getTime()
    )
    setMatchStats(stats)
    setLoading(false)
  }

  const totals = matchStats.reduce(
    (acc, s) => ({
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      yellows: acc.yellows + s.yellows,
      reds: acc.reds + s.reds,
      minutes: acc.minutes + s.minutes,
    }),
    { goals: 0, assists: 0, yellows: 0, reds: 0, minutes: 0 }
  )

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
          <button onClick={() => router.back()} className="text-slate-400 text-2xl leading-none">‹</button>
          <h1 className="text-lg font-bold text-white">{player?.name}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {/* Player card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-4 text-center">
          <div className="w-16 h-16 bg-green-800 rounded-full flex items-center justify-center text-white text-3xl font-black mx-auto mb-3">
            {player?.name.charAt(0)}
          </div>
          <h2 className="text-xl font-black text-white">{player?.name}</h2>
          <p className="text-slate-400 text-sm capitalize">{player?.role}</p>
          <p className="text-slate-500 text-xs mt-1">{matchStats.length} partite · {totals.minutes}&apos;</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: '⚽ Gol', value: totals.goals, color: 'text-green-400' },
            { label: '👟 Assist', value: totals.assists, color: 'text-blue-400' },
            { label: '🟨', value: totals.yellows, color: 'text-yellow-400' },
            { label: '🟥', value: totals.reds, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-3 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Match history */}
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Storico Partite</h2>
        {matchStats.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nessuna partita completata</p>
        ) : (
          <div className="flex flex-col gap-3">
            {matchStats.map(({ match, goals, assists, yellows, reds, minutes }) => (
              <div key={match.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-semibold">vs {match.opponent}</p>
                  <span className="text-slate-300 font-mono font-bold">
                    {match.score_us}–{match.score_them}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{minutes}&apos;</span>
                  {goals > 0 && <span className="text-green-400">{goals} gol</span>}
                  {assists > 0 && <span className="text-blue-400">{assists} assist</span>}
                  {yellows > 0 && <span className="text-yellow-400">{yellows} giallo</span>}
                  {reds > 0 && <span className="text-red-400">{reds} rosso</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NavBar />
    </div>
  )
}
