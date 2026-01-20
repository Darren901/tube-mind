'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewSummaryPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const extractVideoId = (input: string) => {
    try {
      const urlObj = new URL(input)
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v')
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1)
      }
    } catch {
      // Not a URL, maybe it's the ID itself
      if (input.length === 11) return input
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('無效的 YouTube 連結或 ID')
      setIsLoading(false)
      return
    }

    try {
      const checkRes = await fetch('/api/videos/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeId: videoId }),
      })

      if (!checkRes.ok) {
        const data = await checkRes.json()
        throw new Error(data.error || '無法存取影片')
      }

      const { id: dbVideoId } = await checkRes.json()

      const res = await fetch('/api/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: dbVideoId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create summary')
      }

      const summary = await res.json()
      router.push(`/summaries/${summary.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
          建立新摘要
        </h1>
        <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-bg-secondary p-8 rounded-lg border border-white/5">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-text-secondary mb-2 font-ibm">
            YouTube 影片網址
          </label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-bg-tertiary border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue transition font-ibm"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm font-ibm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-text-secondary hover:text-white transition font-ibm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition font-ibm"
          >
            {isLoading ? '處理中...' : '生成摘要'}
          </button>
        </div>
      </form>
    </div>
  )
}
