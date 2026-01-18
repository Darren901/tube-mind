'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { LogIn, ListChecks, CheckCircle } from 'lucide-react'

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  
  const steps = [
    {
      number: '01',
      icon: LogIn,
      iconColor: 'text-brand-blue',
      title: '連結 YouTube 帳號',
      description: ['使用 Google 一鍵登入', '自動匯入訂閱頻道']
    },
    {
      number: '02',
      icon: ListChecks,
      iconColor: 'text-brand-red',
      title: '選擇想追蹤的頻道',
      description: ['點擊「立即更新」抓取最新影片', 'AI 自動開始生成摘要']
    },
    {
      number: '03',
      icon: CheckCircle,
      iconColor: 'text-brand-blue',
      title: '輕鬆閱讀摘要',
      description: ['摘要完成後立即通知', '隨時查看、搜尋、管理']
    }
  ]
  
  return (
    <section ref={ref} className="py-32 bg-gradient-to-b from-bg-primary to-bg-secondary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full bg-gradient-to-r from-brand-red/5 via-transparent to-brand-blue/5 blur-[100px]" />
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs text-brand-red mb-4 tracking-widest"
          >
            HOW IT WORKS
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-rajdhani text-5xl font-bold text-text-primary mb-4"
          >
            三步驟，開啟智能學習
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-ibm text-xl text-text-secondary"
          >
            從註冊到獲得摘要，只需 3 分鐘
          </motion.p>
        </div>
        
        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
                className="relative"
              >
                {/* Connection line (not for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 border-t-2 border-dashed border-brand-blue/30" />
                )}
                
                {/* Number Badge */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red to-brand-red-light rounded-full" />
                    <div className="absolute inset-1 bg-bg-primary rounded-full" />
                    <span className="relative font-bebas text-5xl text-text-primary z-10">{step.number}</span>
                    <div className="absolute -inset-2 border-2 border-brand-blue rounded-full" />
                  </div>
                </div>
                
                {/* Card */}
                <div className="bg-bg-secondary p-8 rounded-2xl border border-bg-tertiary">
                  <div className="flex justify-center mb-4">
                    <Icon className={`w-12 h-12 ${step.iconColor}`} />
                  </div>
                  
                  <h3 className="font-rajdhani text-2xl font-bold text-text-primary text-center mb-4">
                    {step.title}
                  </h3>
                  
                  <div className="space-y-2">
                    {step.description.map((desc, i) => (
                      <p key={i} className="font-ibm text-text-secondary text-center text-sm">
                        {desc}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-center"
        >
          <a 
            href="/auth/signin"
            className="inline-block px-12 py-5 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-xl rounded-lg hover:scale-105 hover:shadow-2xl hover:shadow-brand-red/50 transition-all"
          >
            立即開始使用 TubeMind
          </a>
        </motion.div>
      </div>
    </section>
  )
}
