'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NotionConnectProps {
  initialParentPageId?: string | null
  isConnected: boolean
}

interface NotionPage {
  id: string
  title: string
  icon: string | null
}

export function NotionConnect({ initialParentPageId, isConnected }: NotionConnectProps) {
  const router = useRouter()
  const [parentPageId, setParentPageId] = useState(initialParentPageId || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [pages, setPages] = useState<NotionPage[]>([])
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    if (isConnected) {
      const fetchPages = async () => {
        setIsLoadingPages(true)
        setPageError('')
        try {
          const res = await fetch('/api/notion/pages')
          if (!res.ok) {
            throw new Error('Failed to load pages')
          }
          const data = await res.json()
          setPages(data.pages)
        } catch (err) {
          setPageError('Failed to load accessible pages')
        } finally {
          setIsLoadingPages(false)
        }
      }

      fetchPages()
    }
  }, [isConnected])

  const handleConnect = () => {
    signIn('notion', { callbackUrl: '/settings' })
  }

  const handleSavePageId = async () => {
    setIsSaving(true)
    setError('')
    setIsSuccess(false)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notionParentPageId: parentPageId }),
      })

      if (!res.ok) {
        throw new Error('Failed to update settings')
      }

      setIsSuccess(true)
      router.refresh()
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setIsSuccess(false)
      }, 3000)
    } catch (err) {
      setError('Failed to save Page ID. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Database className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Notion Integration</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Connect your Notion workspace to save summaries.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-300'}`} />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {isConnected ? 'Connected to Notion' : 'Not Connected'}
            </span>
          </div>
          {!isConnected && (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Connect Notion
            </button>
          )}
          {isConnected && (
            <div className="flex items-center text-green-600 dark:text-green-500 text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Active
            </div>
          )}
        </div>

        {/* Parent Page ID Configuration */}
        {isConnected && (
          <div className="space-y-4">
            <div>
              <label htmlFor="parentPageId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Parent Page ID
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                The ID of the Notion page where you want summaries to be created as sub-pages.
              </p>
              {pageError && (
                <p className="text-xs text-red-600 dark:text-red-500 mb-2">
                  {pageError}
                </p>
              )}
              <div className="flex gap-3">
                <select
                  id="parentPageId"
                  value={parentPageId}
                  onChange={(e) => setParentPageId(e.target.value)}
                  disabled={isLoadingPages || !!pageError}
                  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="" disabled>
                    {isLoadingPages ? 'Loading pages...' : 'Select a page...'}
                  </option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.icon ? `${page.icon} ` : ''}
                      {page.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSavePageId}
                  disabled={isSaving}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[80px] justify-center"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>

            {isSuccess && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle className="w-4 h-4" />
                Settings saved successfully
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-500 text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
