'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Youtube, Sparkles, Library } from 'lucide-react'

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  
  const steps = [
    {
      icon: Youtube,
      label: 'Connect',
      title: '連結 YouTube',
      description: '使用 Google OAuth 安全登入，自動匯入所有訂閱頻道。可選擇開啟「自動更新」，每天凌晨自動抓取新影片',
      color: 'brand-red',
      particles: 8
    },
    {
      icon: Sparkles,
      label: 'Customize',
      title: '客製化設定',
      description: '在設定頁選擇摘要語氣（專業/輕鬆/技術或自訂）、詳細程度、TTS 語音。一次設定，之後所有摘要自動套用',
      color: 'brand-blue',
      particles: 12
    },
    {
      icon: Library,
      label: 'Enjoy',
      title: '享受知識流',
      description: 'AI 自動生成摘要、標籤分類、語音播放。可同步至 Notion，隨時搜尋回顧。知識自動流進你的第二大腦',
      color: 'brand-red',
      particles: 6
    }
  ]
  
  return (
    <section ref={ref} className="relative py-24 md:py-40 bg-[#0A0A0A] overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20 md:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="inline-block"
          >
            <div className="font-mono text-xs tracking-[0.3em] text-brand-blue/60 mb-6 uppercase">
              ━━━ How it works ━━━
            </div>
            <h2 className="font-rajdhani text-4xl md:text-7xl font-black text-white leading-tight tracking-tight">
              三個步驟
              <br />
              <span className="bg-gradient-to-r from-brand-blue via-purple-400 to-brand-red bg-clip-text text-transparent">
                開始智能學習
              </span>
            </h2>
          </motion.div>
        </div>

        {/* Pipeline Visualization */}
        <div className="relative">
          {/* Connection Pipeline - Desktop */}
          <div className="hidden md:block absolute top-40 left-0 right-0 h-[2px]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-brand-red via-brand-blue to-brand-red origin-left"
            />
            
            {/* Flowing Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ left: '0%', opacity: 0 }}
                animate={isInView ? {
                  left: ['0%', '100%'],
                  opacity: [0, 1, 1, 0]
                } : {}}
                transition={{
                  duration: 3,
                  delay: 1 + i * 0.4,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "linear"
                }}
                className="absolute top-0 w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                style={{ top: '-3px' }}
              />
            ))}
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isBlue = step.color === 'brand-blue'
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                  className="relative group"
                >
                  {/* Step Number Indicator */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0">
                    <div className={`
                      font-mono text-xs font-bold px-3 py-1 rounded-full border
                      ${isBlue 
                        ? 'text-brand-blue border-brand-blue/30 bg-brand-blue/5' 
                        : 'text-brand-red border-brand-red/30 bg-brand-red/5'
                      }
                    `}>
                      {step.label.toUpperCase()}
                    </div>
                  </div>

                  {/* Main Card */}
                  <div className="relative h-full">
                    {/* Glow Effect */}
                    <div className={`
                      absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl
                      ${isBlue ? 'bg-brand-blue/20' : 'bg-brand-red/20'}
                    `} />
                    
                    {/* Card Content */}
                    <div className="relative h-full bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/10 p-8 overflow-hidden">
                      {/* Particle Background */}
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(step.particles)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ 
                              x: Math.random() * 300,
                              y: -20,
                              opacity: 0 
                            }}
                            animate={isInView ? {
                              y: [Math.random() * 400, 450],
                              opacity: [0, 0.3, 0],
                              scale: [0, 1, 0.5]
                            } : {}}
                            transition={{
                              duration: 2 + Math.random() * 2,
                              delay: index * 0.3 + Math.random() * 2,
                              repeat: Infinity,
                              repeatDelay: Math.random() * 3,
                              ease: "easeInOut"
                            }}
                            className={`absolute w-1 h-1 rounded-full ${isBlue ? 'bg-brand-blue' : 'bg-brand-red'}`}
                          />
                        ))}
                      </div>

                      {/* Icon Container */}
                      <div className="relative mb-6 flex justify-center">
                        <div className={`
                          relative w-20 h-20 rounded-2xl flex items-center justify-center
                          ${isBlue 
                            ? 'bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/30' 
                            : 'bg-gradient-to-br from-brand-red/20 to-brand-red/5 border border-brand-red/30'
                          }
                        `}>
                          <Icon className={`w-9 h-9 ${isBlue ? 'text-brand-blue' : 'text-brand-red'}`} />
                          
                          {/* Rotating Ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className={`absolute inset-0 rounded-2xl border ${isBlue ? 'border-brand-blue/20' : 'border-brand-red/20'}`}
                            style={{ borderWidth: '2px', borderStyle: 'dashed' }}
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative text-center">
                        <h3 className="font-rajdhani text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                          {step.title}
                        </h3>
                        <p className="font-sans text-sm md:text-base text-gray-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Bottom Accent Line */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-center mt-20 md:mt-32"
        >
          <a 
            href="/auth/signin"
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-brand-red to-brand-red-light rounded-xl font-rajdhani font-bold text-lg text-white overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,59,59,0.4)]"
          >
            <span className="relative z-10">立即開始使用</span>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="relative z-10"
            >
              →
            </motion.div>
            
            {/* Shimmer Effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          </a>
          
          <p className="mt-6 font-mono text-xs text-gray-500 tracking-wide">
            無需信用卡 · 完全免費開始
          </p>
        </motion.div>
      </div>
    </section>
  )
}
