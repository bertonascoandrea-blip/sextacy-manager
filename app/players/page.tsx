'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import type { Player } from '@/lib/types'

interface PlayerAggregate {
  player: Player
  matches: number
  minutes: number
  goals: number
  assists: number
  yellows: number
  reds: number
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerAggregate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const sb = getSupabase()

    const [{ data: playersData }, { data: eventsData }, { data: lineupData }, { data: matchesData }] = await Promise.all([
      sb.from('players').select('*').order('name'),
      sb.from('events').select('*, match:matches(status)'),
      sb.from('match_lineups').select('*, match:matches(status)'),
      sb.from('matches').select('id, status, half_duration_mins'),
    ])

    if (!playersData) { setLoading(false); return }

    const doneMatchIds = new Set(
      (matchesData || []).filter((m: { status: string }) => m.status === 'done').map((m: { id: string }) => m.id)
    )

    const aggregates: PlayerAggregate[] = playersData.map(player => {
      const playerEvents = (eventsData || []).filter(
        (e: { player_id: string; match_id: string }) => e.player_id === player.id && doneMatchIds.has(e.match_id)
      )
      const playerLineups = (lineupData || []).filter(
        (l: { player_id: string; match_id: string }) => l.player_id === player.id && doneMatchIds.has(l.match_id)
      )

      const matchSet = new Set([
        ...playerEvents.map((e: { match_id: string }) => e.match_id),
        ...playerLineups.map((l: { match_id: string }) => l.match_id),
      ])

      const minutes = playerLineups.reduce((acc: number, l: { match_id: string }) => {
        const match = (matchesData || []).find((m: { id: string }) => m.id === l.match_id)
        return acc + (match ? match.half_duration_mins * 2 : 0)
      }, 0)

      return {
        player,
        matches: matchSet.size,
        minutes,
        goals: playerEvents.filter((e: { type: string }) => e.type === 'goal').length,
        assists: playerEvents.filter((e: { type: string }) => e.type === 'assist').length,
        yellows: playerEvents.filter((e: { type: string }) => e.type === 'yellow').length,
        reds: playerEvents.filter((e: { type: string }) => e.type === 'red').length,
      }
    })

    aggregates.sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    setPlayers(aggregates)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-white">Giocatori</h1>
          <p className="text-slate-400 text-xs">Rosa Sextacy — statistiche torneo</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {players.map(({ player, matches, minutes, goals, assists, yellows, reds }) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-4 block active:bg-slate-750"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold">{player.name}</p>
                    <p className="text-slate-400 text-xs capitalize">{player.role} · {matches} partite · {minutes}&apos;</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-700 rounded-xl py-2">
                    <p className="text-green-400 text-xl font-black">{goals}</p>
                    <p className="text-slate-400 text-xs">⚽</p>
                  </div>
                  <div className="bg-slate-700 rounded-xl py-2">
                    <p className="text-blue-400 text-xl font-black">{assists}</p>
                    <p className="text-slate-400 text-xs">👟</p>
                  </div>
                  <div className="bg-slate-700 rounded-xl py-2">
                    <p className="text-yellow-400 text-xl font-black">{yellows}</p>
                    <p className="text-slate-400 text-xs">🟨</p>
                  </div>
                  <div className="bg-slate-700 rounded-xl py-2">
                    <p className="text-red-400 text-xl font-black">{reds}</p>
                    <p className="text-slate-400 text-xs">🟥</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <NavBar />
    </div>
  )
}
