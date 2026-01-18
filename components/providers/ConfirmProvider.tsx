'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider')
  return context
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' })
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => {})

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }

  const handleConfirm = () => {
    setOpen(false)
    resolver(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolver(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-secondary border border-white/10 p-6 rounded-xl shadow-2xl z-50 w-[90vw] max-w-md animate-scale-in focus:outline-none">
            <AlertDialog.Title className="text-xl font-bold text-white font-rajdhani mb-2">
              {options.title}
            </AlertDialog.Title>
            {options.description && (
              <AlertDialog.Description className="text-text-secondary font-ibm mb-6">
                {options.description}
              </AlertDialog.Description>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-text-secondary hover:text-white transition font-ibm"
              >
                {options.cancelText || '取消'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition font-ibm ${
                  options.variant === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-brand-blue hover:bg-blue-600'
                }`}
              >
                {options.confirmText || '確認'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}
