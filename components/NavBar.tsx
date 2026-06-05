'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/players', label: 'Giocatori', icon: '👤' },
  { href: '/standings', label: 'Classifica', icon: '📊' },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const sb = getSupabase()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-40">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 py-3 px-4 flex-1 text-xs font-medium transition-colors ${
              pathname === link.href
                ? 'text-green-400'
                : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-3 px-4 flex-1 text-xs font-medium text-slate-400 active:text-slate-200"
        >
          <span className="text-xl">🚪</span>
          <span>Esci</span>
        </button>
      </div>
    </nav>
  )
}
