'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface TextSelectionMenuProps {
  onExplain: (text: string) => void
}

export function TextSelectionMenu({ onExplain }: TextSelectionMenuProps) {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const handleSelection = () => {
      const selectedText = window.getSelection()?.toString().trim()
      if (!selectedText) {
        setSelection(null)
        return
      }

      const range = window.getSelection()?.getRangeAt(0)
      if (!range) return

      const rect = range.getBoundingClientRect()
      // Use pageX/Y to handle scroll correctly
      setSelection({
        text: selectedText,
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top - 10 + window.scrollY,
      })
    }

    document.addEventListener('mouseup', handleSelection)
    return () => document.removeEventListener('mouseup', handleSelection)
  }, [])

  if (!selection) return null

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        style={{
          position: 'absolute',
          left: selection.x,
          top: selection.y,
          transform: 'translate(-50%, -100%)',
        }}
        className="z-50 bg-[#111] border border-brand-blue/50 text-white px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 hover:bg-brand-blue/20 transition cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onExplain(selection.text)
          setSelection(null)
          window.getSelection()?.removeAllRanges()
        }}
      >
        <Sparkles className="w-3 h-3 text-brand-blue" />
        <span className="text-xs font-bold font-rajdhani">AI 解釋</span>
      </motion.button>
    </AnimatePresence>
  )
}
