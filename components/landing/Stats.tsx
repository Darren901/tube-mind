'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import CountUp from 'react-countup'
import { Video, Users, Clock, Target } from 'lucide-react'

export function Stats() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  
  const stats = [
    {
      icon: Video,
      iconColor: 'text-brand-tiffany',
      value: 1000,
      suffix: '+',
      label: '影片已摘要'
    },
    {
      icon: Users,
      iconColor: 'text-brand-red',
      value: 50,
      suffix: '+',
      label: '支援頻道'
    },
    {
      icon: Clock,
      iconColor: 'text-brand-tiffany',
      value: 10000,
      suffix: '+',
      label: '節省時數'
    },
    {
      icon: Target,
      iconColor: 'text-brand-red',
      value: 99,
      suffix: '%',
      label: '準確率'
    }
  ]
  
  return (
    <section ref={ref} className="py-20 bg-bg-primary relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,186,181,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(10,186,181,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            const isRed = stat.iconColor.includes('red')
            const numberColor = isRed ? 'text-gradient-red' : 'text-brand-tiffany'
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="text-center"
              >
                <Icon className={`w-8 h-8 ${stat.iconColor} mx-auto mb-4`} />
                
                <div className={`font-bebas text-7xl ${numberColor} mb-2`}>
                  {isInView && (
                    <CountUp 
                      end={stat.value} 
                      duration={2.5}
                      suffix={stat.suffix}
                    />
                  )}
                </div>
                
                <div className="font-ibm text-text-secondary">
                  {stat.label}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
