'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Sparkles, Volume2, BookOpen, Tags } from 'lucide-react'
import { BrowserFrame } from './BrowserFrame'

export function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })
  
  const features = [
    {
      icon: Sparkles,
      iconColor: 'text-brand-blue',
      title: 'AI 智能摘要，客製化語氣',
      description: 'Gemini AI 自動將任何語言的影片轉為繁體中文結構化摘要。支援專業、輕鬆、技術三種預設語氣，還能自訂語氣風格，讓 AI 用你喜歡的方式說話。',
      points: ['多語言自動翻譯', '三種預設語氣 + 自訂', '可調整詳細程度'],
      image: 'right',
      delay: 0,
      visual: (
        <BrowserFrame className="h-full w-full">
          <div className="p-4 md:p-6 h-full flex flex-col gap-3 overflow-hidden">
            {/* Tone Selector */}
            <div className="flex gap-2 flex-shrink-0">
              {['專業', '輕鬆', '技術'].map((tone, i) => (
                <motion.div
                  key={tone}
                  animate={{ 
                    borderColor: i === 1 ? ['rgba(59,130,246,0.3)', 'rgba(59,130,246,1)', 'rgba(59,130,246,0.3)'] : 'rgba(255,255,255,0.1)',
                    backgroundColor: i === 1 ? ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.2)', 'rgba(59,130,246,0.1)'] : 'transparent'
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="px-3 py-1.5 text-xs rounded-full border"
                >
                  <span className={i === 1 ? 'text-brand-blue font-semibold' : 'text-white/40'}>{tone}</span>
                </motion.div>
              ))}
            </div>
            
            {/* Summary Content */}
            <div className="flex-1 space-y-2 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-secondary z-10 pointer-events-none" />
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                  className="space-y-1"
                >
                  <div className="h-2 bg-white/20 rounded" style={{ width: `${90 - i * 10}%` }} />
                  {i < 4 && <div className="h-2 bg-white/10 rounded" style={{ width: `${80 - i * 10}%` }} />}
                </motion.div>
              ))}
            </div>
          </div>
        </BrowserFrame>
      )
    },
    {
      icon: Volume2,
      iconColor: 'text-brand-red',
      title: '文字轉語音，通勤聽摘要',
      description: '每個摘要都能一鍵轉為語音播放。支援男聲、女聲選擇，讓你在開車、運動、通勤時也能吸收知識，真正做到「聽」懂影片。',
      points: ['Google TTS 高品質語音', '支援男聲/女聲', '背景播放不中斷'],
      image: 'left',
      delay: 0.2,
      visual: (
        <BrowserFrame className="h-full w-full">
          <div className="p-4 md:p-6 h-full flex flex-col items-center justify-center gap-4 overflow-hidden">
            {/* Audio Player */}
            <div className="w-full max-w-full bg-white/5 rounded-xl p-4 border border-white/10">
              {/* Waveform */}
              <div className="flex items-center gap-1 mb-4 h-12">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: ['20%', `${Math.random() * 80 + 20}%`, '20%']
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.05,
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    className="flex-1 bg-brand-red rounded-full"
                  />
                ))}
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-8 h-8 rounded-full bg-brand-red/20 border-2 border-brand-red flex items-center justify-center"
                  >
                    <Volume2 className="w-4 h-4 text-brand-red" />
                  </motion.div>
                  <div className="flex items-center gap-1 text-xs text-white/50 font-mono">
                    <span>1:24</span>
                    <span>/</span>
                    <span>3:45</span>
                  </div>
                </div>
                <div className="px-2 py-1 bg-brand-red/10 border border-brand-red/30 rounded text-xs text-brand-red">
                  女聲
                </div>
              </div>
            </div>
          </div>
        </BrowserFrame>
      )
    },
    {
      icon: BookOpen,
      iconColor: 'text-brand-blue',
      title: '同步至 Notion，打造第二大腦',
      description: '一鍵將摘要自動同步到你的 Notion 工作區。支援自訂目標頁面，讓影片知識無縫整合進你的筆記系統，隨時跨裝置存取。',
      points: ['OAuth 安全連結', '自訂同步目標頁面', '保留原始格式與標籤'],
      image: 'right',
      delay: 0.4,
      visual: (
        <BrowserFrame className="h-full w-full">
          <div className="grid grid-cols-2 h-full divide-x divide-white/5">
            {/* Left: TubeMind */}
            <div className="p-3 md:p-4 space-y-2 overflow-hidden relative bg-bg-primary/50">
              <div className="text-[8px] font-mono text-brand-blue mb-2">TUBEMIND</div>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="p-2 bg-white/5 rounded border border-white/5"
                >
                  <div className="h-1.5 w-3/4 bg-white/20 rounded mb-1" />
                  <div className="h-1 w-1/2 bg-white/10 rounded" />
                </motion.div>
              ))}
            </div>
            
            {/* Right: Notion */}
            <div className="p-3 md:p-4 space-y-2 overflow-hidden relative">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-3 h-3 bg-white/10 rounded" />
                <div className="text-[8px] font-mono text-white/50">NOTION</div>
              </div>
              
              {/* Syncing Animation */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="p-2 bg-white/5 rounded border border-white/5"
                >
                  <div className="h-1.5 w-3/4 bg-white/20 rounded mb-1" />
                  <div className="h-1 w-1/2 bg-white/10 rounded" />
                </motion.div>
              ))}
              
              {/* Sync Icon */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full"
              />
            </div>
          </div>
        </BrowserFrame>
      )
    },
    {
      icon: Tags,
      iconColor: 'text-brand-red',
      title: '智能標籤，秒速找到所需知識',
      description: 'AI 自動為每個摘要生成相關標籤。透過標籤分類、全文搜尋，在數百個摘要中快速定位你需要的資訊，打造可搜尋的影片知識庫。',
      points: ['AI 自動標記主題', '標籤過濾與組合搜尋', '全文檢索引擎'],
      image: 'left',
      delay: 0.6,
      visual: (
        <BrowserFrame className="h-full w-full">
          <div className="p-4 md:p-6 h-full flex flex-col gap-3 overflow-hidden">
            {/* Search Bar */}
            <div className="w-full h-8 bg-white/5 border border-white/10 rounded-lg flex items-center px-3 flex-shrink-0">
              <motion.div 
                animate={{ width: ["0%", "50%", "50%", "0%"] }}
                transition={{ duration: 4, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 }}
                className="h-1.5 bg-white/30 rounded-full"
              />
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {['AI', '教學', '程式設計', 'JavaScript', 'React', '前端'].map((tag, i) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                  className={`
                    px-2.5 py-1 text-xs rounded-full border
                    ${i % 2 === 0 
                      ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue' 
                      : 'bg-brand-red/10 border-brand-red/30 text-brand-red'
                    }
                  `}
                >
                  {tag}
                </motion.div>
              ))}
            </div>
            
            {/* Results */}
            <div className="flex-1 space-y-2 overflow-hidden">
              {[1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  className="p-3 bg-white/5 rounded-lg border border-white/5"
                >
                  <div className="h-2 w-3/4 bg-white/20 rounded mb-2" />
                  <div className="h-1.5 w-1/2 bg-white/10 rounded" />
                </motion.div>
              ))}
            </div>
          </div>
        </BrowserFrame>
      )
    }
  ]
  
  return (
    <section id="features" ref={ref} className="py-20 md:py-32 bg-bg-primary relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
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
            className="font-rajdhani text-3xl md:text-5xl font-bold text-text-primary"
          >
            從影片到知識，全自動完成
          </motion.h2>
        </div>
        
        {/* Feature Items */}
        <div className="space-y-20 md:space-y-32">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isImageRight = feature.image === 'right'
            
            return (
              <div 
                key={index}
                className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${isImageRight ? '' : 'md:grid-flow-dense'}`}
              >
                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 + feature.delay }}
                  className={isImageRight ? '' : 'md:col-start-2'}
                >
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  
                  <h3 className="font-rajdhani text-2xl md:text-4xl font-bold text-text-primary mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="font-ibm text-base md:text-xl text-text-secondary leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {feature.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${feature.iconColor.replace('text-', 'bg-')}`} />
                        <span className="font-ibm text-sm md:text-base text-text-secondary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
                
                {/* Visual - Browser Frame Animation */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.5 + feature.delay }}
                  className={`${isImageRight ? '' : 'md:col-start-1'} h-[280px] md:h-[320px] w-full overflow-hidden`}
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
