'use client'

import { useState } from 'react'
import { OPPONENT_TEAMS, PHASES } from '@/lib/constants'
import type { MatchPhase } from '@/lib/types'

const TOURNAMENT_DATE = '2026-06-06'

interface NewMatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    opponent: string
    scheduled_time: string
    half_duration_mins: number
    phase: MatchPhase
  }) => Promise<void>
}

export function NewMatchModal({ isOpen, onClose, onSubmit }: NewMatchModalProps) {
  const [opponent, setOpponent] = useState('')
  const [customOpponent, setCustomOpponent] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [halfDuration, setHalfDuration] = useState(12)
  const [phase, setPhase] = useState<MatchPhase>('girone')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const finalOpponent = opponent === '__custom__' ? customOpponent : opponent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!finalOpponent.trim()) return
    setLoading(true)
    try {
      // Construct ISO datetime with Italian timezone (CEST = +02:00)
      const scheduled_time = timeValue
        ? `${TOURNAMENT_DATE}T${timeValue}:00+02:00`
        : ''

      await onSubmit({
        opponent: finalOpponent.trim(),
        scheduled_time,
        half_duration_mins: halfDuration,
        phase,
      })
      setOpponent('')
      setCustomOpponent('')
      setTimeValue('')
      setHalfDuration(12)
      setPhase('girone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Nuova Partita</h2>
            <p className="text-slate-500 text-xs mt-0.5">📅 6 giugno 2026</p>
          </div>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Avversario</label>
            <select
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              required={opponent !== '__custom__'}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
            >
              <option value="">Seleziona squadra...</option>
              {OPPONENT_TEAMS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom__">Altro (inserisci)</option>
            </select>
          </div>

          {opponent === '__custom__' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nome avversario</label>
              <input
                type="text"
                value={customOpponent}
                onChange={e => setCustomOpponent(e.target.value)}
                required
                placeholder="Nome squadra..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm placeholder-slate-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fase</label>
            <select
              value={phase}
              onChange={e => setPhase(e.target.value as MatchPhase)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
            >
              {PHASES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Orario (opzionale)</label>
            <input
              type="time"
              value={timeValue}
              onChange={e => setTimeValue(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Durata tempo (minuti)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHalfDuration(d => Math.max(1, d - 1))}
                className="w-12 h-12 bg-slate-700 rounded-xl text-white text-xl font-bold active:bg-slate-600"
              >
                −
              </button>
              <span className="flex-1 text-center text-2xl font-bold text-white">{halfDuration}</span>
              <button
                type="button"
                onClick={() => setHalfDuration(d => Math.min(30, d + 1))}
                className="w-12 h-12 bg-slate-700 rounded-xl text-white text-xl font-bold active:bg-slate-600"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !finalOpponent.trim()}
            className="w-full py-3 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-xl text-white font-semibold mt-2"
          >
            {loading ? 'Creazione...' : 'Crea Partita'}
          </button>
        </form>
      </div>
    </div>
  )
}
