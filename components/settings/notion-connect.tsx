'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { CheckCircle, AlertCircle, Loader2, Database, Link as LinkIcon, ChevronDown } from 'lucide-react'
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
          setPageError('無法載入可用的頁面')
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
      
      setTimeout(() => {
        setIsSuccess(false)
      }, 3000)
    } catch (err) {
      setError('儲存失敗，請重試。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-rajdhani text-white mb-2">Notion 整合</h2>
        <p className="text-text-secondary font-ibm">
          連結您的 Notion 工作區，自動將摘要同步到指定頁面。
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 transition-all duration-300 hover:border-white/10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 左側：狀態區 */}
          <div className="flex-1 space-y-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl border ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-zinc-800/50 border-white/5 text-zinc-500'}`}>
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white font-rajdhani mb-1">
                  {isConnected ? '已連結工作區' : '尚未連結'}
                </h3>
                <p className="text-sm text-text-secondary font-ibm">
                  {isConnected ? 'TubeMind 已獲得寫入權限' : '請授權以啟用同步功能'}
                </p>
              </div>
            </div>

            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 font-semibold py-2.5 px-6 rounded-lg transition-colors font-ibm text-sm"
              >
                <LinkIcon className="w-4 h-4" />
                連結 Notion 帳號
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium bg-green-500/10 py-1.5 px-3 rounded-lg w-fit border border-green-500/20">
                <CheckCircle className="w-4 h-4" />
                連線正常
              </div>
            )}
          </div>

          {/* 右側：設定區 (僅在已連接時顯示) */}
          {isConnected && (
            <div className="flex-1 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="parentPageId" className="block text-sm font-medium text-white mb-2 font-rajdhani tracking-wide">
                    儲存位置 (PARENT PAGE)
                  </label>
                  <p className="text-xs text-text-secondary mb-3 font-ibm">
                    摘要將會建立為此頁面的子頁面。
                  </p>
                  
                  {pageError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 p-2 rounded border border-red-500/20">
                      <AlertCircle className="w-3 h-3" />
                      {pageError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <select
                        id="parentPageId"
                        value={parentPageId}
                        onChange={(e) => setParentPageId(e.target.value)}
                        disabled={isLoadingPages || !!pageError}
                        className="w-full appearance-none bg-black/30 border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 disabled:opacity-50 disabled:cursor-not-allowed font-ibm transition-all"
                      >
                        <option value="" disabled>
                          {isLoadingPages ? '載入頁面中...' : '選擇頁面...'}
                        </option>
                        {pages.map((page) => (
                          <option key={page.id} value={page.id} className="bg-zinc-900">
                            {page.icon && !page.icon.startsWith('http') ? `${page.icon} ` : ''}
                            {page.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                    
                    <button
                      onClick={handleSavePageId}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-brand-blue hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[80px] justify-center font-ibm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '儲存'
                      )}
                    </button>
                  </div>
                </div>

                {isSuccess && (
                  <div className="flex items-center gap-2 text-green-400 text-sm animate-in fade-in slide-in-from-top-1 bg-green-500/10 p-2 rounded border border-green-500/20">
                    <CheckCircle className="w-3 h-3" />
                    設定已儲存
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-1 bg-red-500/10 p-2 rounded border border-red-500/20">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
