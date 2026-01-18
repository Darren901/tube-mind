'use client'

import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-primary">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(10,186,181,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(10,186,181,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-left">
        <motion.h1 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="font-bebas text-8xl md:text-9xl tracking-wider text-gradient-red glow-red mb-4"
        >
          TUBEMIND
        </motion.h1>
        
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-rajdhani text-4xl md:text-5xl font-medium text-brand-tiffany mb-6"
        >
          你的 YouTube 知識庫
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-ibm text-xl text-text-secondary max-w-2xl mb-8"
        >
          追蹤你喜愛的頻道，自動生成繁中摘要，<br />
          再也不用花時間看完整影片
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex gap-4"
        >
          <button className="px-8 py-4 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-lg rounded-lg hover:scale-105 transition-transform">
            開始使用
          </button>
          <button className="px-8 py-4 border-2 border-brand-tiffany text-brand-tiffany font-rajdhani font-bold text-lg rounded-lg hover:bg-brand-tiffany hover:bg-opacity-20 transition-all">
            了解更多
          </button>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ 
          opacity: { delay: 1, duration: 0.6 },
          y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <ArrowDown className="w-8 h-8 text-brand-tiffany" />
      </motion.div>
    </section>
  )
}
