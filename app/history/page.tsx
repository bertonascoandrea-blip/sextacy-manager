'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import type { Match } from '@/lib/types'

const PHASE_LABEL: Record<string, string> = {
  girone: 'Girone',
  playoff: 'Playoff',
  quarti: 'Quarti',
  semi: 'Semifinale',
  finale: 'Finale',
}

function resultBadge(m: Match): { label: string; color: string } {
  if (m.score_us > m.score_them) return { label: 'V', color: 'bg-green-700 text-white' }
  if (m.score_us === m.score_them) return { label: 'P', color: 'bg-yellow-600 text-white' }
  return { label: 'S', color: 'bg-red-700 text-white' }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sb = getSupabase()
      const { data } = await sb
        .from('matches')
        .select('*')
        .eq('status', 'done')
        .order('scheduled_time', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      setMatches((data as Match[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const wins   = matches.filter(m => m.score_us > m.score_them).length
  const draws  = matches.filter(m => m.score_us === m.score_them).length
  const losses = matches.filter(m => m.score_us < m.score_them).length
  const goalsFor     = matches.reduce((s, m) => s + m.score_us, 0)
  const goalsAgainst = matches.reduce((s, m) => s + m.score_them, 0)

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-white">Storico Partite</h1>
          <p className="text-slate-400 text-xs">Torneo 12 Ore · Grugliasco 2026</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center pt-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-400">Nessuna partita completata</p>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{matches.length}</p>
                <p className="text-slate-500 text-[10px]">Giocate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-green-400">{wins}</p>
                <p className="text-slate-500 text-[10px]">Vittorie</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-yellow-400">{draws}</p>
                <p className="text-slate-500 text-[10px]">Pareggi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-red-400">{losses}</p>
                <p className="text-slate-500 text-[10px]">Sconfitte</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white font-mono">{goalsFor}–{goalsAgainst}</p>
                <p className="text-slate-500 text-[10px]">Reti</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {matches.map(m => {
                const badge = resultBadge(m)
                return (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}/summary`}
                    className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-3 active:bg-slate-700"
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${badge.color}`}>
                      {badge.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold leading-tight">vs {m.opponent}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-500 text-xs">{PHASE_LABEL[m.phase]}</span>
                        {m.scheduled_time && (
                          <span className="text-slate-600 text-xs font-mono">{formatDate(m.scheduled_time)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 flex-shrink-0">
                      <span className={`text-2xl font-black font-mono ${
                        m.score_us > m.score_them ? 'text-green-400' :
                        m.score_us === m.score_them ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {m.score_us}–{m.score_them}
                      </span>
                    </div>
                    <span className="text-slate-600 text-sm flex-shrink-0">›</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      <NavBar />
    </div>
  )
}
