import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Sextacy Manager',
  description: 'Torneo 12 Ore - Grugliasco Oratorio 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-slate-900 text-white">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
