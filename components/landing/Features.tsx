'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Youtube, Globe, Search, Check, MousePointer2 } from 'lucide-react'
import { BrowserFrame } from './BrowserFrame'

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
      delay: 0,
      visual: (
        <BrowserFrame className="h-full w-full max-w-md mx-auto aspect-video md:aspect-auto">
          <div className="p-6 flex flex-col items-center justify-center h-full gap-4 relative">
            {/* Initial State: Connect Button */}
            <motion.div
              animate={{ opacity: [1, 0, 0, 1], scale: [1, 0.9, 0.9, 1] }}
              transition={{ duration: 4, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 }}
              className="absolute z-10"
            >
              <div className="px-5 py-2.5 bg-brand-red text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-red/20">
                <Youtube className="w-4 h-4" /> 連結 YouTube
              </div>
              {/* Cursor */}
              <motion.div 
                animate={{ x: [20, 0, 0, 20], y: [20, 0, 0, 20], opacity: [0, 1, 0, 0] }}
                transition={{ duration: 4, times: [0, 0.2, 0.3, 1], repeat: Infinity, repeatDelay: 1 }}
                className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2"
              >
                <MousePointer2 className="w-6 h-6 text-white fill-black stroke-[1.5px]" />
              </motion.div>
            </motion.div>

            {/* Result State: Channel List */}
            <motion.div
              animate={{ opacity: [0, 0, 1, 0], y: [20, 20, 0, 20] }}
              transition={{ duration: 4, times: [0, 0.2, 0.3, 1], repeat: Infinity, repeatDelay: 1 }}
              className="w-full space-y-3"
            >
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-24 bg-white/20 rounded" />
                    <div className="h-1.5 w-16 bg-white/10 rounded" />
                  </div>
                  <div className="w-4 h-4 rounded border border-brand-blue bg-brand-blue flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </BrowserFrame>
      )
    },
    {
      icon: Globe,
      iconColor: 'text-brand-red',
      title: '打破語言隔閡，吸收全球知識',
      description: '無論是英文演講、日文教學還是韓文綜藝，TubeMind 自動將各國語言影片轉化為結構清晰的繁體中文摘要，讓您的學習無國界。',
      points: ['支援 100+ 種語言輸入', '自動翻譯為繁體中文', '保留原文專有名詞'],
      image: 'left',
      delay: 0.2,
      visual: (
        <BrowserFrame className="h-full w-full max-w-md mx-auto aspect-video md:aspect-auto">
          <div className="grid grid-cols-2 h-full divide-x divide-white/5">
            {/* Left: Transcript */}
            <div className="p-4 space-y-2 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-transparent to-bg-secondary z-10" />
              <motion.div
                animate={{ y: [0, -100] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="space-y-3"
              >
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex gap-2 opacity-40">
                    <div className="text-[8px] font-mono text-brand-blue pt-0.5">00:{(10 + i * 5)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 w-full bg-white/20 rounded" />
                      <div className="h-1.5 w-2/3 bg-white/20 rounded" />
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
            
            {/* Right: Summary Typing */}
            <div className="p-4 space-y-3 bg-bg-tertiary/20">
              <div className="h-3 w-16 bg-brand-blue/20 rounded mb-4 border border-brand-blue/20" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: i === 3 ? "70%" : "100%" }}
                    transition={{ duration: 0.5, delay: i * 0.5, repeat: Infinity, repeatDelay: 3 }}
                    className="h-2 bg-white/60 rounded"
                  />
                ))}
              </div>
            </div>
          </div>
        </BrowserFrame>
      )
    },
    {
      icon: Search,
      iconColor: 'text-brand-blue',
      title: '隨時搜尋，快速回顧',
      description: '所有摘要集中存放，強大的搜尋功能讓你秒找關鍵資訊。建立你的個人 YouTube 知識庫，永不遺忘。',
      points: ['全文搜尋', '標籤分類', '收藏管理'],
      image: 'right',
      delay: 0.4,
      visual: (
        <BrowserFrame className="h-full w-full max-w-md mx-auto aspect-video md:aspect-auto">
          <div className="p-6 h-full flex flex-col items-center">
            {/* Search Bar */}
            <div className="w-full max-w-[200px] h-8 bg-white/5 border border-white/10 rounded-full flex items-center px-3 mb-6">
              <Search className="w-3 h-3 text-white/50 mr-2" />
              <motion.div 
                animate={{ width: ["0%", "40%", "40%", "0%"] }}
                transition={{ duration: 4, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 }}
                className="h-1.5 bg-white/30 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 }}
                className="ml-0.5 w-0.5 h-3 bg-brand-blue"
              />
            </div>
            
            {/* Results */}
            <div className="w-full space-y-2">
              {[1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0, 0, 1, 0], y: [10, 10, 0, 10] }}
                  transition={{ duration: 4, times: [0, 0.3 + i * 0.1, 0.4 + i * 0.1, 1], repeat: Infinity, repeatDelay: 1 }}
                  className="h-14 bg-white/5 rounded-lg border border-white/5 p-3 flex gap-3"
                >
                  <div className="w-8 h-8 bg-white/10 rounded" />
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <div className="h-2 w-3/4 bg-white/20 rounded" />
                    <div className="h-1.5 w-1/2 bg-white/10 rounded" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </BrowserFrame>
      )
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
                
                {/* Visual - Browser Frame Animation */}
                <motion.div
                  initial={{ opacity: 0, x: isImageRight ? 80 : -80 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: feature.delay + 0.2 }}
                  className={`${isImageRight ? '' : 'md:col-start-1'} h-[300px]`}
                >
                  {feature.visual}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

