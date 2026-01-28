'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { X } from 'lucide-react'

export function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  
  const problems = [
    '每天數十個新影片通知，根本看不完',
    '想快速了解內容，卻要看完整 20 分鐘影片',
    '精彩內容散落各處，無法系統化整理'
  ]
  
  return (
    <section ref={ref} className="py-20 md:py-32 bg-bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-blue opacity-5 blur-[100px]" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left side - Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-blue/20 blur-3xl" />
              <div className="relative bg-bg-secondary p-6 rounded-2xl border border-white/10 overflow-hidden h-[300px] md:h-[400px]">
                {/* Header Mockup */}
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <div className="ml-4 h-2 w-32 bg-white/10 rounded-full" />
                </div>

                {/* Notifications */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20, y: 10 }}
                      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
                      transition={{ delay: 0.5 + i * 0.4, duration: 0.5 }}
                      className="flex items-center gap-3 p-3 bg-bg-tertiary/50 rounded-lg border border-white/5"
                    >
                      <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-3/4 bg-white/10 rounded" />
                        <div className="h-2 w-1/2 bg-white/5 rounded" />
                      </div>
                      <div className="w-2 h-2 rounded-full bg-brand-red shadow-[0_0_8px_rgba(255,59,59,0.8)] animate-pulse" />
                    </motion.div>
                  ))}
                </div>
                
                {/* Fade Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-secondary to-transparent" />
              </div>
            </div>
          </motion.div>
          
          {/* Right side - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-mono text-xs text-brand-blue mb-4 tracking-widest"
            >
              THE PROBLEM
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-rajdhani text-4xl md:text-5xl font-bold text-text-primary mb-6 md:mb-8"
            >
              訂閱了 <span className="text-brand-red">50 個頻道</span>
              <br />
              卻沒時間看完任何一個？
            </motion.h2>
            
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.15 }}
                  className="flex items-start gap-3"
                >
                  <X className="w-6 h-6 text-brand-red flex-shrink-0 mt-1" />
                  <p className="font-ibm text-lg md:text-xl text-text-secondary">{problem}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-red opacity-5 blur-[100px]" />
    </section>
  )
}
