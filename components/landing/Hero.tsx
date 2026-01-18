'use client'

import { motion } from 'framer-motion'
import { ArrowDown, Sparkles, ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-primary">
      {/* Background Grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
        {/* Radial Gradient overlay for depth */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-bg-primary/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 hover:bg-white/10 transition-colors cursor-default"
        >
          <Sparkles className="w-4 h-4 text-brand-blue" />
          <span className="text-sm font-mono text-brand-blue tracking-wide">AI VIDEO SUMMARIZATION</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-rajdhani font-bold text-7xl md:text-8xl lg:text-9xl tracking-tight text-white mb-2"
        >
          TUBEMIND
        </motion.h1>

        {/* Subtitle with Gradient */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-rajdhani font-bold text-5xl md:text-6xl lg:text-7xl mb-8"
        >
          <span className="text-gradient-blue">跨越語言，掌握全球知識</span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-ibm text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          AI 自動摘要全球 YouTube 影片<br className="hidden md:block" />將任何語言轉化為繁體中文重點<br className="hidden md:block" />
          省下 90% 觀看時間，知識獲取零時差
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="/auth/signin"
            className="group px-8 py-4 bg-white text-black font-rajdhani font-bold text-xl rounded-lg hover:bg-brand-blue hover:text-white transition-all flex items-center gap-2"
          >
            免費開始使用
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView()}
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-rajdhani font-bold text-xl rounded-lg hover:bg-white/10 transition-all"
          >
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
        className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer"
        onClick={() => document.getElementById('features')?.scrollIntoView()}
      >
        <ArrowDown className="w-8 h-8 text-white/30 hover:text-white transition-colors" />
      </motion.div>
    </section>
  )
}
