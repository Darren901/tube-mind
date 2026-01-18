'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-bg-primary/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-bold font-rajdhani tracking-wide text-white">
            TUBE<span className="text-brand-blue">MIND</span>
          </Link>

          <div className="flex gap-6 items-center">
            <Link href="/summaries" className="text-text-secondary hover:text-white transition font-ibm">
              摘要
            </Link>
            <Link href="/channels" className="text-text-secondary hover:text-white transition font-ibm">
              頻道
            </Link>
            <Link
              href="/summaries/new"
              className="hidden md:inline-block bg-brand-blue hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition font-ibm"
            >
              建立摘要
            </Link>

            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-text-secondary hover:text-white transition font-ibm"
              >
                登出
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="text-text-secondary hover:text-white transition font-ibm"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
