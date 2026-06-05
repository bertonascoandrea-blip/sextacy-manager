'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { useToast } from '@/components/Toast'
import type { Standing } from '@/lib/types'

const FIELDS: { key: keyof Standing; label: string; short: string }[] = [
  { key: 'played', label: 'Partite', short: 'G' },
  { key: 'won', label: 'Vittorie', short: 'V' },
  { key: 'drawn', label: 'Pareggi', short: 'P' },
  { key: 'lost', label: 'Sconfitte', short: 'S' },
  { key: 'goals_for', label: 'Gol fatti', short: 'GF' },
  { key: 'goals_against', label: 'Gol subiti', short: 'GS' },
  { key: 'points', label: 'Punti', short: 'Pt' },
]

interface EditState {
  id: string
  field: keyof Standing
  value: number
}

export default function StandingsPage() {
  const { showToast } = useToast()
  const [group1, setGroup1] = useState<Standing[]>([])
  const [group2, setGroup2] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const sb = getSupabase()
    const { data } = await sb.from('standings').select('*').order('points', { ascending: false })
    if (data) {
      setGroup1(data.filter((s: Standing) => s.group_name === '1').sort((a: Standing, b: Standing) => b.points - a.points))
      setGroup2(data.filter((s: Standing) => s.group_name === '2').sort((a: Standing, b: Standing) => b.points - a.points))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCellTap = (standing: Standing, field: keyof Standing) => {
    if (field === 'id' || field === 'team_name' || field === 'group_name' || field === 'updated_at') return
    setEditing({ id: standing.id, field, value: standing[field] as number })
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

  const StandingsTable = ({ teams, groupLabel }: { teams: Standing[]; groupLabel: string }) => (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-bold text-white">Girone {groupLabel}</h2>
        <p className="text-slate-500 text-xs mt-0.5">Tocca un valore per modificarlo</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700">
              <th className="text-left px-3 py-2 min-w-[100px]">Squadra</th>
              {FIELDS.map(f => (
                <th key={f.key} className="text-center px-2 py-2 min-w-[36px]">{f.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((standing, i) => (
              <tr
                key={standing.id}
                className={`border-b border-slate-700/50 ${standing.team_name === 'Sextacy' ? 'bg-green-900/20' : ''}`}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-4">{i + 1}</span>
                    <span className={`font-semibold ${standing.team_name === 'Sextacy' ? 'text-green-400' : 'text-white'}`}>
                      {standing.team_name}
                    </span>
                  </div>
                </td>
                {FIELDS.map(f => (
                  <td key={f.key} className="text-center px-2 py-3">
                    <button
                      onClick={() => handleCellTap(standing, f.key)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors active:bg-slate-600 ${
                        f.key === 'points'
                          ? 'bg-green-800 text-green-200'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {standing[f.key] as number}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
            <StandingsTable teams={group1} groupLabel="1" />
            <StandingsTable teams={group2} groupLabel="2" />
          </>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70">
          <div className="w-full bg-slate-800 rounded-t-3xl border-t border-slate-700 p-6 pb-10">
            <h3 className="text-lg font-bold text-white mb-1">
              {FIELDS.find(f => f.key === editing.field)?.label}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Inserisci il nuovo valore
            </p>

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
                onChange={e => setEditing(prev => prev ? { ...prev, value: parseInt(e.target.value) || 0 } : null)}
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
