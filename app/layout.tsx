import type { Metadata } from 'next'
import { Bebas_Neue, Rajdhani, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas'
})

const rajdhani = Rajdhani({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani'
})

const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm'
})

export const metadata: Metadata = {
  title: 'TubeMind - 你的 YouTube 知識庫',
  description: 'AI 自動生成 YouTube 影片繁中摘要，打造你的第二大腦',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={`${bebasNeue.variable} ${rajdhani.variable} ${ibmPlexSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
