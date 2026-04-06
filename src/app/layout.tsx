import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TRJ BOT - Discord Tools',
  description: 'أدوات ديسكورد متقدمة - نسخ السيرفرات، نيوكر، ماكرو',
  keywords: 'discord, bot, tools, nuker, macro, copy server',
  authors: [{ name: 'Trj.py' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
