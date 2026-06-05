'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const sb = getSupabase()
    const { error: authError } = await sb.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o password non corretti')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-black text-white tracking-tight">SEXTACY</h1>
          <p className="text-green-400 font-semibold text-sm mt-1">MANAGER</p>
          <p className="text-slate-500 text-xs mt-2">Torneo 12 Ore · Grugliasco 2026</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="email@esempio.it"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-700 active:bg-green-800 disabled:bg-slate-600 rounded-xl text-white font-bold text-lg mt-1"
          >
            {loading ? 'Accesso...' : 'Entra'}
          </button>
        </form>
      </div>
    </div>
  )
}
