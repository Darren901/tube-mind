'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Youtube } from 'lucide-react'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-bg-secondary rounded-lg border border-white/10">
        <h1 className="text-4xl font-bold text-center mb-2 text-white font-rajdhani">
          TUBE<span className="text-brand-blue">MIND</span>
        </h1>
        <p className="text-text-secondary text-center mb-8 font-ibm">
          自動追蹤頻道，AI 生成繁中摘要
        </p>
        
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 font-ibm flex items-center justify-center gap-3"
        >
          <Youtube className="w-5 h-5" />
          使用 Google 帳號登入
        </button>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}
