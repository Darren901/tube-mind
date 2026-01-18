'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Youtube, Brain, Search, Check } from 'lucide-react'

export function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })
  
  const features = [
    {
      icon: Youtube,
      iconColor: 'text-brand-red',
      title: '連結 YouTube，秒速開始',
      description: '使用 Google 帳號登入，自動匯入你的所有訂閱頻道。無需手動添加，一鍵完成設置。',
      points: ['OAuth 安全登入', '自動同步訂閱', '隱私優先，資料加密'],
      image: 'right',
      delay: 0
    },
    {
      icon: Brain,
      iconColor: 'text-brand-red',
      title: 'Gemini AI 深度理解',
      description: '不只是字幕轉錄，而是真正理解影片內容。自動提取重點、整理架構，生成易讀的繁中摘要。',
      points: ['多語言字幕支援', '智能段落分類', '關鍵時間戳記'],
      image: 'left',
      delay: 0.2
    },
    {
      icon: Search,
      iconColor: 'text-brand-blue',
      title: '隨時搜尋，快速回顧',
      description: '所有摘要集中存放，強大的搜尋功能讓你秒找關鍵資訊。建立你的個人 YouTube 知識庫，永不遺忘。',
      points: ['全文搜尋', '標籤分類', '收藏管理'],
      image: 'right',
      delay: 0.4
    }
  ]
  
  return (
    <section id="features" ref={ref} className="py-32 bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs text-brand-blue mb-4 tracking-widest"
          >
            CORE FEATURES
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-rajdhani text-5xl font-bold text-text-primary"
          >
            強大功能，簡單操作
          </motion.h2>
        </div>
        
        {/* Feature Items */}
        <div className="space-y-32">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isImageRight = feature.image === 'right'
            
            return (
              <div 
                key={index}
                className={`grid md:grid-cols-2 gap-12 items-center ${isImageRight ? '' : 'md:grid-flow-dense'}`}
              >
                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, x: isImageRight ? -80 : 80 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: feature.delay }}
                  className={isImageRight ? '' : 'md:col-start-2'}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  
                  <h3 className="font-rajdhani text-4xl font-bold text-text-primary mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="font-ibm text-xl text-text-secondary leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {feature.points.map((point, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-brand-blue flex-shrink-0" />
                        <span className="font-ibm text-text-secondary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
                
                {/* Visual/Image placeholder */}
                <motion.div
                  initial={{ opacity: 0, x: isImageRight ? 80 : -80 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: feature.delay + 0.2 }}
                  className={isImageRight ? '' : 'md:col-start-1'}
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-blue/20 blur-3xl group-hover:blur-2xl transition-all" />
                    <div className="relative bg-bg-secondary p-8 rounded-2xl border border-brand-blue/30 aspect-video flex items-center justify-center hover:scale-105 transition-transform">
                      <Icon className={`w-24 h-24 ${feature.iconColor} opacity-20`} strokeWidth={1} />
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
