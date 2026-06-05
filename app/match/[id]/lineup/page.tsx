'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { Match, Player } from '@/lib/types'

export default function LineupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [starters, setStarters] = useState<Set<string>>(new Set())
  const [captain, setCaptain] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    const sb = getSupabase()
    const [{ data: matchData }, { data: playersData }, { data: existingLineup }] = await Promise.all([
      sb.from('matches').select('*').eq('id', id).single(),
      sb.from('players').select('*').order('name'),
      sb.from('match_lineups').select('*').eq('match_id', id),
    ])

    if (matchData) setMatch(matchData)
    if (playersData) setPlayers(playersData)
    if (existingLineup && existingLineup.length > 0) {
      setSelected(new Set(existingLineup.map((l: { player_id: string }) => l.player_id)))
      // Cap starters at 5: if old data saved everyone as starter, only first 5 (by name) start
      const allStarters = existingLineup.filter((l: { is_starter: boolean }) => l.is_starter)
      const cappedStarters = allStarters.slice(0, 5)
      setStarters(new Set(cappedStarters.map((l: { player_id: string }) => l.player_id)))
      const cap = existingLineup.find((l: { is_captain: boolean }) => l.is_captain)
      if (cap) setCaptain(cap.player_id)
    }

    setLoading(false)
  }

  const togglePlayer = (playerId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
        if (captain === playerId) setCaptain(null)
        setStarters(s => { const ns = new Set(s); ns.delete(playerId); return ns })
      } else {
        next.add(playerId)
        // Auto-bench if already have 5 starters (5vs5 format)
        setStarters(s => s.size < 5 ? new Set([...s, playerId]) : s)
      }
      return next
    })
  }

  const toggleStarter = (playerId: string) => {
    setStarters(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size === 0) {
      showToast('Seleziona almeno un giocatore', 'warning')
      return
    }
    setSaving(true)
    const sb = getSupabase()

    await sb.from('match_lineups').delete().eq('match_id', id)

    const rows = Array.from(selected).map(pid => ({
      match_id: id,
      player_id: pid,
      is_captain: pid === captain,
      is_starter: starters.has(pid),
    }))

    const { error } = await sb.from('match_lineups').insert(rows)

    if (error) {
      showToast('Errore salvataggio formazione', 'error')
      setSaving(false)
      return
    }

    await sb.from('matches').update({ status: 'live' }).eq('id', id)

    showToast('Formazione salvata!', 'success')
    router.push(`/match/${id}/live`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 text-2xl leading-none">‹</button>
          <div>
            <h1 className="text-lg font-bold text-white">Formazione</h1>
            {match && <p className="text-slate-400 text-xs">vs {match.opponent}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 mb-4">
          <p className="text-slate-400 text-sm">
            Selezionati: <span className="text-white font-bold">{selected.size}</span> giocatori
            {' · '}
            <span className="text-green-400 font-bold">{starters.size} titolari</span>
            {selected.size - starters.size > 0 && (
              <span className="text-slate-400"> · {selected.size - starters.size} panchina</span>
            )}
          </p>
          {captain && (
            <p className="text-yellow-400 text-xs mt-1">
              Capitano: {players.find(p => p.id === captain)?.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {players.map(player => {
            const isSelected = selected.has(player.id)
            const isCaptain = captain === player.id

            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-green-900/30 border-green-700'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <button
                  onClick={() => togglePlayer(player.id)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    isSelected
                      ? 'border-green-500 bg-green-600 text-white'
                      : 'border-slate-500 bg-slate-700 text-transparent'
                  }`}
                >
                  ✓
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">{player.name}</p>
                  <p className="text-slate-500 text-xs capitalize">{player.role}</p>
                </div>

                {isSelected && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleStarter(player.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        starters.has(player.id)
                          ? 'bg-green-700 border-green-600 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-400'
                      }`}
                    >
                      {starters.has(player.id) ? 'Titolare' : 'Panchina'}
                    </button>
                    <button
                      onClick={() => setCaptain(isCaptain ? null : player.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        isCaptain
                          ? 'bg-yellow-500 border-yellow-400 text-black'
                          : 'bg-slate-700 border-slate-600 text-slate-300'
                      }`}
                    >
                      {isCaptain ? '© Cap' : 'Cap?'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          className="w-full mt-6 py-4 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-2xl text-white font-bold text-lg"
        >
          {saving ? 'Salvataggio...' : 'Salva e vai LIVE →'}
        </button>
      </main>
    </div>
  )
}
