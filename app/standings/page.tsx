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

type NumKey = 'played' | 'won' | 'drawn' | 'lost' | 'goals_for' | 'goals_against' | 'points'

const STAT_DEFS: { key: NumKey; label: string; short: string }[] = [
  { key: 'played',        label: 'Giocate',    short: 'G'  },
  { key: 'won',           label: 'Vittorie',   short: 'V'  },
  { key: 'drawn',         label: 'Pareggi',    short: 'P'  },
  { key: 'lost',          label: 'Sconfitte',  short: 'S'  },
  { key: 'goals_for',     label: 'Gol fatti',  short: 'GF' },
  { key: 'goals_against', label: 'Gol subiti', short: 'GS' },
  { key: 'points',        label: 'Punti',      short: 'Pt' },
]

const QUAL_COLORS = [
  'border-l-[3px] border-l-green-500',
  'border-l-[3px] border-l-green-500',
  'border-l-[3px] border-l-green-500',
  'border-l-[3px] border-l-yellow-500',
  'border-l-[3px] border-l-red-600',
]

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

type DraftValues = Record<NumKey, number>

export default function StandingsPage() {
  const { showToast } = useToast()
  const [group1, setGroup1] = useState<DisplayStanding[]>([])
  const [group2, setGroup2] = useState<DisplayStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'1' | '2'>('1')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftValues>({
    played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0,
  })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const sb = getSupabase()
    const [{ data: standingsData }, { data: matchesData }] = await Promise.all([
      sb.from('standings').select('*'),
      sb.from('matches').select('*').eq('status', 'done'),
    ])

    if (!standingsData) { setLoading(false); return }

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

  const handleCardTap = (standing: DisplayStanding) => {
    if (expandedId === standing.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(standing.id)
    if (!standing.isAuto) {
      setDraft({
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goals_for: standing.goals_for,
        goals_against: standing.goals_against,
        points: standing.points,
      })
    }
  }

  const adjust = (key: NumKey, delta: number) => {
    setDraft(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
  }

  const handleSave = async (standingId: string) => {
    setSaving(true)
    const sb = getSupabase()
    const { error } = await sb
      .from('standings')
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq('id', standingId)

    if (error) {
      showToast('Errore salvataggio', 'error')
    } else {
      showToast('Salvato!', 'success')
      setExpandedId(null)
      await loadData()
    }
    setSaving(false)
  }

  const activeGroup = activeTab === '1' ? group1 : group2

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-white">Classifica</h1>
          <p className="text-slate-400 text-xs">Torneo 12 Ore · Grugliasco 2026</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[68px] bg-slate-900 border-b border-slate-800 z-10 px-4 pb-3 pt-3">
        <div className="max-w-lg mx-auto flex gap-2">
          {(['1', '2'] as const).map(g => (
            <button
              key={g}
              onClick={() => { setActiveTab(g); setExpandedId(null) }}
              className={`flex-1 h-11 rounded-xl font-bold text-sm transition-colors ${
                activeTab === g
                  ? 'bg-green-700 text-white'
                  : 'bg-slate-800 text-slate-400 active:bg-slate-700'
              }`}
            >
              Girone {g}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex gap-4 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Quarti (1°–3°)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 inline-block" /> Playoff (4°)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Playoff (5°)
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {activeGroup.map((standing, i) => {
                const isExpanded = expandedId === standing.id
                return (
                  <div
                    key={standing.id}
                    className={`bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden ${QUAL_COLORS[i] ?? ''}`}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => handleCardTap(standing)}
                      className="w-full px-4 py-4 flex items-center gap-3 active:bg-slate-700/50 text-left"
                    >
                      <span className="text-slate-500 font-mono text-sm w-5 flex-shrink-0 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-base leading-snug ${
                            standing.team_name === 'Sextacy' ? 'text-green-300' : 'text-white'
                          }`}>
                            {standing.team_name}
                          </span>
                          {standing.isAuto && <span className="text-green-500 text-xs">✨</span>}
                        </div>
                        <div className="flex gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span>G{standing.played}</span>
                          <span>V{standing.won}</span>
                          <span>P{standing.drawn}</span>
                          <span>S{standing.lost}</span>
                          <span>DR{standing.diff >= 0 ? '+' : ''}{standing.diff}</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <span className="text-3xl font-black text-white">{standing.points}</span>
                        <span className="text-slate-500 text-xs mb-0.5">Pt</span>
                      </div>
                      <span className="text-slate-600 text-sm flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="border-t border-slate-700 px-4 py-4">
                        {standing.isAuto ? (
                          /* Sextacy: read-only view */
                          <div>
                            <p className="text-xs text-green-400 mb-3">✨ Calcolato automaticamente dalle partite</p>
                            <div className="grid grid-cols-4 gap-2">
                              {STAT_DEFS.map(stat => (
                                <div key={stat.key} className={`bg-slate-700 rounded-xl p-3 text-center ${
                                  stat.key === 'points' ? 'col-span-2' : ''
                                }`}>
                                  <p className={`text-xl font-black ${stat.key === 'points' ? 'text-green-400' : 'text-white'}`}>
                                    {standing[stat.key]}
                                  </p>
                                  <p className="text-slate-400 text-[10px] mt-0.5">{stat.short}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Editable team */
                          <div>
                            <div className="flex flex-col gap-3 mb-4">
                              {STAT_DEFS.map(stat => (
                                <div key={stat.key} className="flex items-center gap-3">
                                  <span className="text-slate-400 text-xs font-mono w-6 flex-shrink-0">{stat.short}</span>
                                  <button
                                    onClick={() => adjust(stat.key, -1)}
                                    className="w-12 h-12 bg-slate-700 active:bg-slate-600 rounded-xl text-white text-xl font-bold flex-shrink-0"
                                  >
                                    −
                                  </button>
                                  <span className={`flex-1 text-center text-2xl font-black ${
                                    stat.key === 'points' ? 'text-green-400' : 'text-white'
                                  }`}>
                                    {draft[stat.key]}
                                  </span>
                                  <button
                                    onClick={() => adjust(stat.key, 1)}
                                    className="w-12 h-12 bg-slate-700 active:bg-slate-600 rounded-xl text-white text-xl font-bold flex-shrink-0"
                                  >
                                    +
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => handleSave(standing.id)}
                              disabled={saving}
                              className="w-full h-12 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-xl text-white font-bold"
                            >
                              {saving ? 'Salvataggio...' : '💾 Salva'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-slate-600 text-xs mt-4 pb-2">
              Criteri: Pt → DR → V → GF → GS → Sorteggio
            </p>
          </>
        )}
      </main>

      <NavBar />
    </div>
  )
}
