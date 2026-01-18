# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a modern, animated landing page for TubeMind with black tech styling, red/Tiffany green accents, and scroll parallax effects.

**Architecture:** Server-side routing logic redirects authenticated users to dashboard, displays landing page for visitors. Landing page split into 7 reusable components with Framer Motion animations. CSS Variables for theming.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Framer Motion, Lucide React, Google Fonts (Bebas Neue, Rajdhani, IBM Plex Sans)

---

## Task 1: Setup CSS Variables and Global Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Add Google Fonts to layout**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Bebas_Neue, Rajdhani, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas'
})

const rajdhani = Rajdhani({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani'
})

const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm'
})

export const metadata: Metadata = {
  title: 'TubeMind - 你的 YouTube 知識庫',
  description: 'AI 自動生成 YouTube 影片繁中摘要，打造你的第二大腦',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={`${bebasNeue.variable} ${rajdhani.variable} ${ibmPlexSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Step 2: Update globals.css with CSS Variables and base styles**

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Colors */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #2a2a2a;
  
  --color-red: #FF3B3B;
  --color-red-light: #FF6B6B;
  --color-tiffany: #0ABAB5;
  
  --color-text-primary: #E5E5E5;
  --color-text-secondary: #A0A0A0;
  
  /* Fonts */
  --font-bebas: 'Bebas Neue', sans-serif;
  --font-rajdhani: 'Rajdhani', sans-serif;
  --font-ibm: 'IBM Plex Sans', sans-serif;
}

@layer base {
  body {
    @apply bg-[#0a0a0a] text-[#E5E5E5];
    font-family: var(--font-ibm);
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-rajdhani);
  }
}

@layer utilities {
  .text-gradient-red {
    @apply bg-gradient-to-r from-[#FF3B3B] to-[#FF6B6B] bg-clip-text text-transparent;
  }
  
  .glow-red {
    text-shadow: 0 0 20px rgba(255, 59, 59, 0.5);
  }
  
  .glow-tiffany {
    text-shadow: 0 0 20px rgba(10, 186, 181, 0.5);
  }
}
```

**Step 3: Update Tailwind config to use CSS variables**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'brand-red': 'var(--color-red)',
        'brand-red-light': 'var(--color-red-light)',
        'brand-tiffany': 'var(--color-tiffany)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
      },
      fontFamily: {
        bebas: 'var(--font-bebas)',
        rajdhani: 'var(--font-rajdhani)',
        ibm: 'var(--font-ibm)',
      },
    },
  },
  plugins: [],
}
```

**Step 4: Test by running dev server**

Run: `npm run dev`
Expected: Server starts without errors, fonts load correctly

**Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx tailwind.config.js
git commit -m "feat: setup CSS variables and Google Fonts for landing page"
```

---

## Task 2: Create Landing Page Components Structure

**Files:**
- Create: `components/landing/Hero.tsx`
- Create: `components/landing/Problem.tsx`
- Create: `components/landing/Solution.tsx`
- Create: `components/landing/Features.tsx`
- Create: `components/landing/HowItWorks.tsx`
- Create: `components/landing/Stats.tsx`
- Create: `components/landing/CTAFooter.tsx`

**Step 1: Create Hero component skeleton**

```typescript
// components/landing/Hero.tsx
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
```

**Step 2: Create remaining component skeletons**

```typescript
// components/landing/Problem.tsx
'use client'

export function Problem() {
  return (
    <section className="py-32 bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">Problem Section</h2>
        </div>
      </div>
    </section>
  )
}

// components/landing/Solution.tsx
'use client'

export function Solution() {
  return (
    <section className="py-32 bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">Solution Section</h2>
        </div>
      </div>
    </section>
  )
}

// components/landing/Features.tsx
'use client'

export function Features() {
  return (
    <section className="py-32 bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">Features Section</h2>
        </div>
      </div>
    </section>
  )
}

// components/landing/HowItWorks.tsx
'use client'

export function HowItWorks() {
  return (
    <section className="py-32 bg-gradient-to-b from-bg-primary to-bg-secondary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">How It Works Section</h2>
        </div>
      </div>
    </section>
  )
}

// components/landing/Stats.tsx
'use client'

export function Stats() {
  return (
    <section className="py-20 bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">Stats Section</h2>
        </div>
      </div>
    </section>
  )
}

// components/landing/CTAFooter.tsx
'use client'

export function CTAFooter() {
  return (
    <section className="py-24 bg-gradient-to-b from-bg-secondary to-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold">CTA Footer Section</h2>
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Test components render**

Run: `npm run dev`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/landing/
git commit -m "feat: create landing page component skeletons"
```

---

## Task 3: Update Root Page with Routing Logic

**Files:**
- Modify: `app/page.tsx`

**Step 1: Create new root page with auth redirect**

```typescript
// app/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Hero } from '@/components/landing/Hero'
import { Problem } from '@/components/landing/Problem'
import { Solution } from '@/components/landing/Solution'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Stats } from '@/components/landing/Stats'
import { CTAFooter } from '@/components/landing/CTAFooter'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect('/(dashboard)')
  }
  
  // Show landing page for visitors
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <HowItWorks />
      <Stats />
      <CTAFooter />
    </main>
  )
}
```

**Step 2: Test routing logic**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Expected: Landing page shows (Hero with TUBEMIND title visible)

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page with auth redirect logic"
```

---

## Task 4: Implement Problem Section

**Files:**
- Modify: `components/landing/Problem.tsx`

**Step 1: Implement full Problem section**

```typescript
// components/landing/Problem.tsx
'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { X } from 'lucide-react'

export function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  
  const problems = [
    '每天數十個新影片通知，根本看不完',
    '想快速了解內容，卻要看完整 20 分鐘影片',
    '精彩內容散落各處，無法系統化整理'
  ]
  
  return (
    <section ref={ref} className="py-32 bg-bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-tiffany opacity-5 blur-[100px]" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-tiffany/20 blur-3xl" />
              <div className="relative bg-bg-secondary p-8 rounded-2xl border border-bg-tertiary">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 opacity-50">
                      <div className="w-16 h-16 bg-bg-tertiary rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                        <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right side - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-mono text-xs text-brand-tiffany mb-4 tracking-widest"
            >
              THE PROBLEM
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, x: 80 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-rajdhani text-5xl font-bold text-text-primary mb-8"
            >
              訂閱了 <span className="text-brand-red">50 個頻道</span>
              <br />
              卻沒時間看完任何一個？
            </motion.h2>
            
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.15 }}
                  className="flex items-start gap-3"
                >
                  <X className="w-6 h-6 text-brand-red flex-shrink-0 mt-1" />
                  <p className="font-ibm text-xl text-text-secondary">{problem}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-red opacity-5 blur-[100px]" />
    </section>
  )
}
```

**Step 2: Test Problem section**

Run: `npm run dev`
Expected: Problem section displays with animations on scroll

**Step 3: Commit**

```bash
git add components/landing/Problem.tsx
git commit -m "feat: implement Problem section with animations"
```

---

## Task 5: Implement Solution Section

**Files:**
- Modify: `components/landing/Solution.tsx`

**Step 1: Implement Solution section with cards**

```typescript
// components/landing/Solution.tsx
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
            const glowColor = feature.color === 'red' ? 'group-hover:shadow-brand-red/50' : 'group-hover:shadow-brand-tiffany/50'
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: feature.delay }}
                className={`group relative ${feature.featured ? 'md:scale-110 md:-mt-8' : ''}`}
              >
                <div className={`
                  relative bg-bg-primary p-8 rounded-2xl border border-transparent
                  hover:border-${feature.color === 'red' ? 'brand-red' : 'brand-tiffany'}
                  hover:-translate-y-2 transition-all duration-300
                  ${glowColor} hover:shadow-2xl
                `}>
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-full bg-${feature.color === 'red' ? 'brand-red' : 'brand-tiffany'}/10 flex items-center justify-center mb-6`}>
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
```

**Step 2: Test Solution section**

Run: `npm run dev`
Expected: Three feature cards with hover effects

**Step 3: Commit**

```bash
git add components/landing/Solution.tsx
git commit -m "feat: implement Solution section with feature cards"
```

---

## Task 6: Implement Features Section (Detailed)

**Files:**
- Modify: `components/landing/Features.tsx`

**Step 1: Implement Features section**

```typescript
// components/landing/Features.tsx
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
      iconColor: 'text-brand-tiffany',
      title: '隨時搜尋，快速回顧',
      description: '所有摘要集中存放，強大的搜尋功能讓你秒找關鍵資訊。建立你的個人 YouTube 知識庫，永不遺忘。',
      points: ['全文搜尋', '標籤分類', '收藏管理'],
      image: 'right',
      delay: 0.4
    }
  ]
  
  return (
    <section ref={ref} className="py-32 bg-bg-primary">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs text-brand-tiffany mb-4 tracking-widest"
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
                        <Check className="w-5 h-5 text-brand-tiffany flex-shrink-0" />
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
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-tiffany/20 blur-3xl group-hover:blur-2xl transition-all" />
                    <div className="relative bg-bg-secondary p-8 rounded-2xl border border-brand-tiffany/30 aspect-video flex items-center justify-center hover:scale-105 transition-transform">
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
```

**Step 2: Test Features section**

Run: `npm run dev`
Expected: Three alternating feature blocks

**Step 3: Commit**

```bash
git add components/landing/Features.tsx
git commit -m "feat: implement Features section with detailed descriptions"
```

---

## Task 7: Implement How It Works Section

**Files:**
- Modify: `components/landing/HowItWorks.tsx`

**Step 1: Implement How It Works with timeline**

```typescript
// components/landing/HowItWorks.tsx
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
      iconColor: 'text-brand-tiffany',
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
      iconColor: 'text-brand-tiffany',
      title: '輕鬆閱讀摘要',
      description: ['摘要完成後立即通知', '隨時查看、搜尋、管理']
    }
  ]
  
  return (
    <section ref={ref} className="py-32 bg-gradient-to-b from-bg-primary to-bg-secondary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full bg-gradient-to-r from-brand-red/5 via-transparent to-brand-tiffany/5 blur-[100px]" />
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
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 border-t-2 border-dashed border-brand-tiffany/30" />
                )}
                
                {/* Number Badge */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red to-brand-red-light rounded-full" />
                    <div className="absolute inset-1 bg-bg-primary rounded-full" />
                    <span className="relative font-bebas text-5xl text-text-primary z-10">{step.number}</span>
                    <div className="absolute -inset-2 border-2 border-brand-tiffany rounded-full" />
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
          <button className="px-12 py-5 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-xl rounded-lg hover:scale-105 hover:shadow-2xl hover:shadow-brand-red/50 transition-all">
            立即開始使用 TubeMind
          </button>
        </motion.div>
      </div>
    </section>
  )
}
```

**Step 2: Test How It Works section**

Run: `npm run dev`
Expected: Three step cards with timeline

**Step 3: Commit**

```bash
git add components/landing/HowItWorks.tsx
git commit -m "feat: implement How It Works section with timeline"
```

---

## Task 8: Implement Stats Section with CountUp

**Files:**
- Modify: `components/landing/Stats.tsx`

**Step 1: Install react-countup**

Run: `npm install react-countup`

**Step 2: Implement Stats section**

```typescript
// components/landing/Stats.tsx
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
```

**Step 3: Test Stats section**

Run: `npm run dev`
Expected: Four stats with count-up animation

**Step 4: Commit**

```bash
git add components/landing/Stats.tsx package.json package-lock.json
git commit -m "feat: implement Stats section with CountUp animation"
```

---

## Task 9: Implement CTA Footer

**Files:**
- Modify: `components/landing/CTAFooter.tsx`

**Step 1: Implement full CTA Footer**

```typescript
// components/landing/CTAFooter.tsx
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
            <button className="group px-10 py-5 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-xl rounded-lg hover:scale-105 hover:shadow-2xl hover:shadow-brand-red/50 transition-all flex items-center justify-center gap-2">
              免費開始使用
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="px-10 py-5 border-2 border-brand-tiffany text-brand-tiffany font-rajdhani font-bold text-xl rounded-lg hover:bg-brand-tiffany hover:bg-opacity-10 transition-all">
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
```

**Step 2: Test CTA Footer**

Run: `npm run dev`
Expected: CTA section with footer links

**Step 3: Commit**

```bash
git add components/landing/CTAFooter.tsx
git commit -m "feat: implement CTA Footer with call-to-action buttons"
```

---

## Task 10: Add Click Handlers and Smooth Scrolling

**Files:**
- Modify: `components/landing/Hero.tsx`
- Modify: `components/landing/CTAFooter.tsx`
- Modify: `app/globals.css`

**Step 1: Add smooth scroll CSS**

```css
/* app/globals.css - add this at the end */

html {
  scroll-behavior: smooth;
}
```

**Step 2: Update Hero buttons with auth redirect**

```typescript
// components/landing/Hero.tsx - update button section
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.6 }}
  className="flex gap-4"
>
  <a 
    href="/auth/signin"
    className="px-8 py-4 bg-gradient-to-r from-brand-red to-brand-red-light text-white font-rajdhani font-bold text-lg rounded-lg hover:scale-105 transition-transform"
  >
    開始使用
  </a>
  <button 
    onClick={() => document.getElementById('features')?.scrollIntoView()}
    className="px-8 py-4 border-2 border-brand-tiffany text-brand-tiffany font-rajdhani font-bold text-lg rounded-lg hover:bg-brand-tiffany hover:bg-opacity-20 transition-all"
  >
    了解更多
  </button>
</motion.div>
```

**Step 3: Add ID to Features section**

```typescript
// components/landing/Features.tsx - add id to section
<section id="features" ref={ref} className="py-32 bg-bg-primary">
```

**Step 4: Update CTA Footer buttons**

```typescript
// components/landing/CTAFooter.tsx - update buttons
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
```

**Step 5: Test navigation**

Run: `npm run dev`
Test: Click "了解更多" should scroll to Features
Test: Click "開始使用" should navigate to /auth/signin

**Step 6: Commit**

```bash
git add components/landing/Hero.tsx components/landing/CTAFooter.tsx components/landing/Features.tsx app/globals.css
git commit -m "feat: add navigation and smooth scrolling to landing page"
```

---

## Task 11: Final Testing and Polish

**Files:**
- None (testing only)

**Step 1: Full page test**

Run: `npm run dev`
Navigate to: `http://localhost:3000`

**Test checklist:**
- [ ] All 7 sections render correctly
- [ ] Fonts load (Bebas Neue, Rajdhani, IBM Plex Sans)
- [ ] Colors match design (red #FF3B3B, tiffany #0ABAB5)
- [ ] Animations trigger on scroll
- [ ] Hero animations play on page load
- [ ] Stats count up when scrolled into view
- [ ] Hover effects work on cards
- [ ] CTA buttons link correctly
- [ ] Smooth scrolling works
- [ ] Responsive on mobile (test at 375px width)

**Step 2: Test auth redirect**

Login with Google account
Navigate to: `http://localhost:3000`
Expected: Redirect to /(dashboard) page

**Step 3: Build test**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Final commit**

```bash
git commit --allow-empty -m "test: verify landing page functionality"
```

---

## Completion

**Plan complete and saved to `docs/plans/2026-01-18-landing-page-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
