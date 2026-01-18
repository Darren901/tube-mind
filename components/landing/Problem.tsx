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
    <section ref={ref} className="py-32 bg-bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-tiffany opacity-5 blur-[100px]" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-tiffany/20 blur-3xl" />
              <div className="relative bg-bg-secondary p-8 rounded-2xl border border-bg-tertiary">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 opacity-50">
                      <div className="w-16 h-16 bg-bg-tertiary rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                        <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right side - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-mono text-xs text-brand-tiffany mb-4 tracking-widest"
            >
              THE PROBLEM
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, x: 80 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-rajdhani text-5xl font-bold text-text-primary mb-8"
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
                  <p className="font-ibm text-xl text-text-secondary">{problem}</p>
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
