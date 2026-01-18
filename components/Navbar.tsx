'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-black border-b border-purple-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
            TubeMind
          </Link>
          
          <div className="flex gap-6 items-center">
            <Link href="/" className="text-gray-300 hover:text-white transition">
              首頁
            </Link>
            <Link href="/channels" className="text-gray-300 hover:text-white transition">
              頻道
            </Link>
            <Link href="/summaries" className="text-gray-300 hover:text-white transition">
              摘要
            </Link>
            
            <Link
              href="/summaries/new"
              className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
            >
              建立摘要
            </Link>
            
            {session?.user && (
              <button
                onClick={() => signOut()}
                className="text-gray-300 hover:text-white transition"
              >
                登出
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
