'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/players', label: 'Rosa', icon: '👥' },
  { href: '/standings', label: 'Girone', icon: '📊' },
  { href: '/regolamento', label: 'Regole', icon: '📋' },
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
            className={`flex flex-col items-center gap-0.5 py-2.5 px-2 flex-1 text-[10px] font-medium transition-colors ${
              pathname === link.href
                ? 'text-green-400'
                : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 py-2.5 px-2 flex-1 text-[10px] font-medium text-slate-400 active:text-slate-200"
        >
          <span className="text-lg">🚪</span>
          <span>Esci</span>
        </button>
      </div>
    </nav>
  )
}
