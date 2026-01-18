'use client'

import { SessionProvider } from 'next-auth/react'
import { ConfirmProvider } from '@/components/providers/ConfirmProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </SessionProvider>
  )
}
