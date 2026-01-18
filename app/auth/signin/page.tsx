'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 rounded-lg border border-purple-500/30">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
          TubeMind
        </h1>
        <p className="text-gray-400 text-center mb-8">
          自動追蹤頻道，AI 生成繁中摘要
        </p>
        
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          使用 Google 登入
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
