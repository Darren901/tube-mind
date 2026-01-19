'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Maximize2, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatWidgetProps {
  videoTitle: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  messages: any[]
  input: string
  handleInputChange: (e: any) => void
  handleSubmit: (e: any) => void
  isLoading: boolean
  append: (message: any) => void
}

export function ChatWidget({ 
  videoTitle, 
  isOpen, 
  setIsOpen,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  append
}: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-blue rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
          >
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              width: isExpanded ? '600px' : '380px',
              height: isExpanded ? '80vh' : '600px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 right-8 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden font-ibm"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                <span className="font-rajdhani font-bold text-white">AI 學習助手</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-white transition"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(messages || []).length === 0 && (
                <div className="text-center text-text-secondary py-8">
                  <p className="mb-2">👋 你好！我是這部影片的 AI 助手。</p>
                  <p className="text-sm px-4">你可以問我任何關於「{videoTitle}」的問題。</p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    <button 
                      onClick={() => append({ role: 'user', content: '這部影片的核心觀點是什麼？' })}
                      className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition"
                    >
                      核心觀點是什麼？
                    </button>
                    <button 
                      onClick={() => append({ role: 'user', content: '請總結 3 個關鍵結論' })}
                      className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition"
                    >
                      總結 3 個結論
                    </button>
                  </div>
                </div>
              )}
              
              {(messages || []).map((m: any) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-brand-blue text-white rounded-tr-none'
                        : 'bg-white/10 text-gray-200 rounded-tl-none'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-3 rounded-lg rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5">
              <div className="relative">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="問關於這部影片的問題..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-brand-blue transition"
                />
                <button
                  type="submit"
                  disabled={isLoading || !(input || '').trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-blue text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-brand-blue transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
