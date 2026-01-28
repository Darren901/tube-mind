'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Plus, LogOut, Menu, X } from 'lucide-react'

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 當路由改變時自動關閉選單
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // 禁止背景捲動
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const isActive = (path: string) => pathname.startsWith(path)

  const NAV_LINKS = [
    { name: '摘要', path: '/summaries' },
    { name: '頻道', path: '/channels' },
    { name: '設定', path: '/settings' }
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* Glass Background */}
      <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-xl border-b border-white/5" />

      {/* Bottom Energy Beam (Gradient Line) */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* LOGO */}
          <Link href="/" className="group relative flex items-center gap-1 z-50">
            {/* Glow Effect */}
            <div className="absolute -inset-2 bg-brand-blue/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition duration-500" />

            <Image
              src="/logo-nobg.png"
              alt="TubeMind Logo"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain relative z-10"
            />

            <span className="text-xl sm:text-2xl font-bold font-rajdhani tracking-wide text-white relative z-10">
              TUBE<span className="text-brand-blue">MIND</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`relative font-ibm text-sm tracking-wide transition-colors hover:text-white ${isActive(link.path) ? 'text-white font-medium' : 'text-text-secondary'}`}
                >
                  {link.name}
                  {isActive(link.path) && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-blue rounded-full shadow-[0_0_8px_#3B82F6]" />
                  )}
                </Link>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-white/10" />

            {/* Auth Actions (Desktop) */}
            {session?.user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/summaries/new"
                  className="flex items-center gap-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/50 hover:border-brand-blue text-sm font-semibold py-2 px-4 rounded-lg transition-all font-ibm group"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  <span>建立摘要</span>
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                  title="登出"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full w-8 h-8 border border-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue font-bold border border-brand-blue/30">
                      {session.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <LogOut className="w-4 h-4 text-text-secondary group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-brand-blue hover:bg-blue-600 text-white text-sm font-semibold py-2 px-6 rounded-lg transition shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] font-ibm"
              >
                登入
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors z-50"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-bg-primary/95 backdrop-blur-xl md:hidden pt-24 px-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-6">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-lg font-ibm py-3 border-b border-white/5 ${
                    isActive(link.path) ? 'text-brand-blue font-medium' : 'text-zinc-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Mobile Auth Actions */}
            {session?.user ? (
              <div className="flex flex-col gap-4 mt-4">
                <Link
                  href="/summaries/new"
                  className="flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  <Plus className="w-5 h-5" />
                  <span>建立新摘要</span>
                </Link>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 mt-4">
                  <div className="flex items-center gap-3">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full w-10 h-10 border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue font-bold border border-brand-blue/30">
                        {session.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{session.user.name}</span>
                      <span className="text-xs text-zinc-500 truncate max-w-[150px]">{session.user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-brand-blue text-white text-center font-semibold py-3 px-6 rounded-xl mt-4"
              >
                登入帳號
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
