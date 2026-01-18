'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'

export function CTAFooter() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  
  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Main CTA */}
      <div className="py-24 bg-gradient-to-b from-bg-secondary to-bg-primary relative">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-r from-brand-red/8 to-brand-tiffany/8 blur-[100px]" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs text-brand-tiffany mb-4 tracking-widest"
          >
            READY TO START?
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-rajdhani text-6xl font-bold text-text-primary mb-6"
          >
            讓 <span className="text-brand-red">AI</span> 成為你的學習助手
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-ibm text-xl text-text-secondary mb-10"
          >
            立即開始，讓每個 YouTube 影片都變成你的知識資產
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a 
              href="/auth/signin"
              className="group px-10 py-5 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-xl rounded-lg hover:scale-105 hover:shadow-2xl hover:shadow-brand-red/50 transition-all flex items-center justify-center gap-2"
            >
              免費開始使用
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView()}
              className="px-10 py-5 border-2 border-brand-tiffany text-brand-tiffany font-rajdhani font-bold text-xl rounded-lg hover:bg-brand-tiffany hover:bg-opacity-10 transition-all"
            >
              查看功能
            </button>
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-bg-primary py-10 border-t border-bg-tertiary">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-secondary">
            <div className="font-ibm">
              © 2026 TubeMind. All rights reserved.
            </div>
            
            <div className="flex gap-6 font-ibm">
              <a href="#" className="hover:text-brand-tiffany transition-colors">隱私政策</a>
              <a href="#" className="hover:text-brand-tiffany transition-colors">服務條款</a>
              <a href="#" className="hover:text-brand-tiffany transition-colors">聯絡我們</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
