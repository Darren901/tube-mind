'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface QuotaData {
  used: number
  limit: number
  remaining: number
  resetAt: string | null
  isGuest?: boolean
}

interface QuotaContextType {
  quota: QuotaData | null
  loading: boolean
  refreshQuota: () => Promise<void>
}

const QuotaContext = createContext<QuotaContextType | undefined>(undefined)

export function QuotaProvider({ children }: { children: ReactNode }) {
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/quota')
      if (res.ok) {
        const data = await res.json()
        setQuota(data)
      }
    } catch (error) {
      console.error('Failed to fetch quota:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuota()
    // Refresh every 60 seconds
    const interval = setInterval(fetchQuota, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <QuotaContext.Provider value={{ quota, loading, refreshQuota: fetchQuota }}>
      {children}
    </QuotaContext.Provider>
  )
}

export function useQuota() {
  const context = useContext(QuotaContext)
  if (context === undefined) {
    throw new Error('useQuota must be used within a QuotaProvider')
  }
  return context
}
