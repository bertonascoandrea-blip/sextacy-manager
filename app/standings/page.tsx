'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { useToast } from '@/components/Toast'
import type { Standing, Match } from '@/lib/types'

interface DisplayStanding extends Standing {
  diff: number
  isAuto: boolean
}

type NumericStandingKey = 'played' | 'won' | 'drawn' | 'lost' | 'goals_for' | 'goals_against' | 'points'

const EDITABLE_FIELDS: { key: NumericStandingKey; label: string; short: string }[] = [
  { key: 'played', label: 'Giocate', short: 'G' },
  { key: 'won', label: 'Vittorie', short: 'V' },
  { key: 'drawn', label: 'Pareggi', short: 'P' },
  { key: 'lost', label: 'Sconfitte', short: 'S' },
  { key: 'goals_for', label: 'Gol fatti', short: 'GF' },
  { key: 'goals_against', label: 'Gol subiti', short: 'GS' },
  { key: 'points', label: 'Punti', short: 'Pt' },
]

interface EditState {
  id: string
  teamName: string
  field: NumericStandingKey
  value: number
}

// Tiebreaker order: punti > scontro diretto (manual) > diff reti > vittorie > gf > ga > nome
function sortGroup(teams: DisplayStanding[]): DisplayStanding[] {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.diff !== a.diff) return b.diff - a.diff
    if (b.won !== a.won) return b.won - a.won
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against
    return a.team_name.localeCompare(b.team_name)
  })
}

const QUAL_COLORS = [
  'border-l-4 border-l-green-500',   // 1° - diritto quarti
  'border-l-4 border-l-green-500',   // 2° - diritto quarti
  'border-l-4 border-l-green-500',   // 3° - diritto quarti
  'border-l-4 border-l-yellow-500',  // 4° - playoff
  'border-l-4 border-l-red-600',     // 5° - playoff
]

export default function StandingsPage() {
  const { showToast } = useToast()
  const [group1, setGroup1] = useState<DisplayStanding[]>([])
  const [group2, setGroup2] = useState<DisplayStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const sb = getSupabase()
    const [{ data: standingsData }, { data: matchesData }] = await Promise.all([
      sb.from('standings').select('*'),
      sb.from('matches').select('*').eq('status', 'done'),
    ])

    if (!standingsData) { setLoading(false); return }

    // Auto-calculate Sextacy's stats from completed matches
    const sextacy = (matchesData as Match[] || []).reduce(
      (acc, m) => {
        acc.played++
        acc.goals_for += m.score_us
        acc.goals_against += m.score_them
        if (m.score_us > m.score_them) { acc.won++; acc.points += 3 }
        else if (m.score_us === m.score_them) { acc.drawn++; acc.points += 1 }
        else acc.lost++
        return acc
      },
      { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 }
    )

    const display: DisplayStanding[] = (standingsData as Standing[]).map(s => {
      const base = s.team_name === 'Sextacy' ? { ...s, ...sextacy } : s
      return { ...base, diff: base.goals_for - base.goals_against, isAuto: s.team_name === 'Sextacy' }
    })

    setGroup1(sortGroup(display.filter(s => s.group_name === '1')))
    setGroup2(sortGroup(display.filter(s => s.group_name === '2')))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCellTap = (standing: DisplayStanding, field: NumericStandingKey) => {
    if (standing.isAuto) {
      showToast('Le statistiche di Sextacy sono calcolate automaticamente', 'info')
      return
    }
    setEditing({ id: standing.id, teamName: standing.team_name, field, value: standing[field] })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    const sb = getSupabase()
    const { error } = await sb
      .from('standings')
      .update({ [editing.field]: editing.value, updated_at: new Date().toISOString() })
      .eq('id', editing.id)

    if (error) {
      showToast('Errore salvataggio', 'error')
    } else {
      showToast('Aggiornato!', 'success')
      await loadData()
    }
    setSaving(false)
    setEditing(null)
  }

  const GroupTable = ({ teams, groupNum }: { teams: DisplayStanding[]; groupNum: string }) => (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Girone {groupNum}</h2>
          <p className="text-slate-500 text-xs mt-0.5">Tocca cella per modificare · ✨ = auto da DB</p>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <p className="text-xs text-green-400">▋ Quarti (1°–3°)</p>
          <p className="text-xs text-yellow-400">▋ Playoff (4°–5°)</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[340px]">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700 bg-slate-900/30">
              <th className="text-left pl-4 pr-2 py-2 w-6">#</th>
              <th className="text-left px-2 py-2">Squadra</th>
              {EDITABLE_FIELDS.map(f => (
                <th key={f.key} className={`text-center px-1.5 py-2 ${f.key === 'points' ? 'font-bold text-slate-300' : ''}`}>
                  {f.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((standing, i) => (
              <tr
                key={standing.id}
                className={`border-b border-slate-700/40 ${QUAL_COLORS[i] ?? ''} ${
                  standing.team_name === 'Sextacy' ? 'bg-green-900/15' : ''
                }`}
              >
                <td className="pl-4 pr-2 py-3 text-slate-500 font-mono">{i + 1}</td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold truncate max-w-[90px] ${
                      standing.team_name === 'Sextacy' ? 'text-green-300' : 'text-white'
                    }`}>
                      {standing.team_name}
                    </span>
                    {standing.isAuto && <span className="text-green-500 text-[9px]">✨</span>}
                  </div>
                </td>
                {EDITABLE_FIELDS.map(f => {
                  const val = standing[f.key]
                  const isPoints = f.key === 'points'
                  return (
                    <td key={f.key} className="text-center px-1 py-3">
                      <button
                        onClick={() => handleCellTap(standing, f.key)}
                        disabled={standing.isAuto}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          standing.isAuto
                            ? 'cursor-default text-slate-300'
                            : 'active:bg-slate-600 cursor-pointer'
                        } ${isPoints ? 'bg-green-800/60 text-green-200' : 'bg-slate-700 text-slate-200'}`}
                      >
                        {val}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tiebreaker note */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/20">
        <p className="text-slate-600 text-[10px]">
          Criteri: Pt → Scontro diretto → Diff reti → V → GF → GS → Sorteggio
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-white">Classifica</h1>
          <p className="text-slate-400 text-xs">Torneo 12 Ore · Grugliasco 2026</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <GroupTable teams={group1} groupNum="1" />
            <GroupTable teams={group2} groupNum="2" />
          </>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70">
          <div className="w-full bg-slate-800 rounded-t-3xl border-t border-slate-700 p-6 pb-10 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-white">
              {editing.teamName} — {EDITABLE_FIELDS.find(f => f.key === editing.field)?.label}
            </h3>
            <p className="text-slate-400 text-sm mb-5 mt-0.5">Modifica valore manuale</p>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setEditing(e => e ? { ...e, value: Math.max(0, e.value - 1) } : null)}
                className="w-14 h-14 bg-slate-700 rounded-2xl text-white text-2xl font-bold active:bg-slate-600"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={editing.value}
                onChange={e => setEditing(prev => prev ? { ...prev, value: Math.max(0, parseInt(e.target.value) || 0) } : null)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-2xl text-center text-3xl font-black text-white py-3 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={() => setEditing(e => e ? { ...e, value: e.value + 1 } : null)}
                className="w-14 h-14 bg-slate-700 rounded-2xl text-white text-2xl font-bold active:bg-slate-600"
              >
                +
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3 bg-slate-700 active:bg-slate-600 rounded-2xl text-white font-semibold"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-2xl text-white font-bold"
              >
                {saving ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  )
}
