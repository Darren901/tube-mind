'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Rss, Sparkles, Database } from 'lucide-react'

export function Solution() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  
  const features = [
    {
      icon: Rss,
      title: '追蹤頻道',
      description: '連結 YouTube 帳號，一鍵匯入訂閱頻道，自動監控新影片',
      color: 'tiffany',
      delay: 0
    },
    {
      icon: Sparkles,
      title: '智能摘要',
      description: 'Gemini AI 自動生成繁中摘要，提取關鍵重點，5 分鐘掌握 1 小時內容',
      color: 'red',
      delay: 0.15,
      featured: true
    },
    {
      icon: Database,
      title: '知識留存',
      description: '所有摘要集中管理，隨時搜尋回顧，打造你的專屬知識庫',
      color: 'tiffany',
      delay: 0.3
    }
  ]
  
  return (
    <section ref={ref} className="py-32 bg-bg-secondary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-gradient-to-r from-brand-red/5 to-brand-tiffany/5 blur-[150px]" />
      </div>
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs text-brand-red mb-4 tracking-widest"
          >
            THE SOLUTION
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-rajdhani text-6xl font-bold text-text-primary mb-6"
          >
            TubeMind 讓 <span className="text-brand-tiffany">AI</span> 幫你看影片
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-ibm text-2xl text-text-secondary"
          >
            自動追蹤、智能摘要、知識留存
          </motion.p>
        </div>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const borderColor = feature.color === 'red' ? 'border-brand-red' : 'border-brand-tiffany'
            const iconColor = feature.color === 'red' ? 'text-brand-red' : 'text-brand-tiffany'
            const bgColor = feature.color === 'red' ? 'bg-brand-red/10' : 'bg-brand-tiffany/10'
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: feature.delay }}
                className={`group relative ${feature.featured ? 'md:scale-110 md:-mt-8' : ''}`}
              >
                <div className={`
                  relative bg-bg-primary p-8 rounded-2xl border ${borderColor}
                  hover:border-opacity-100 border-opacity-30
                  hover:-translate-y-2 transition-all duration-300
                  hover:shadow-2xl
                `}>
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center mb-6`}>
                    <Icon className={`w-10 h-10 ${iconColor}`} strokeWidth={1.5} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-rajdhani text-3xl font-bold text-text-primary mb-4">
                    {feature.title}
                  </h3>
                  <p className="font-ibm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
