'use client'

import { useState } from 'react'
import { Sparkles, Database, User, Bell, Settings2 } from 'lucide-react'
import { SummaryPreferences } from '@/components/settings/summary-preferences'
import { NotionConnect } from '@/components/settings/notion-connect'
import type { SummaryPreferences as SummaryPreferencesType } from '@/lib/validators/settings'

interface SettingsShellProps {
  userSettings: {
    summaryTone: string
    summaryToneCustom?: string | null
    summaryDetail: string
    ttsVoice: string
    notionParentPageId?: string | null
  }
  notionStatus: {
    isConnected: boolean
  }
}

const TABS = [
  { 
    id: 'summary', 
    label: '摘要偏好', 
    description: '調整 AI 摘要風格與語音',
    icon: Sparkles 
  },
  { 
    id: 'integration', 
    label: '整合設定', 
    description: 'Notion 與其他第三方連結',
    icon: Database 
  },
  { 
    id: 'account', 
    label: '帳號管理', 
    description: '個人資料與訂閱方案',
    icon: User,
    disabled: true 
  },
  { 
    id: 'notifications', 
    label: '通知設定', 
    description: 'Email 與推播通知',
    icon: Bell, 
    disabled: true 
  },
]

export function SettingsShell({ userSettings, notionStatus }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState('summary')

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* 左側側邊欄導航 */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="mb-6 px-2">
             <h2 className="text-lg font-semibold text-white font-rajdhani flex items-center gap-2">
               <Settings2 className="w-5 h-5 text-brand-blue" />
               設定選單
             </h2>
          </div>
          
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 group
                  ${activeTab === tab.id 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'}
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-brand-blue' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                
                <span className="text-sm font-ibm">{tab.label}</span>

                {/* Active Indicator (Right Border) - Optional, removed for cleaner look or keep small dot */}
                {activeTab === tab.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_#3B82F6]" />
                )}
              </button>
            ))}
          </nav>

          {/* 版本資訊 (Optional) */}
          <div className="mt-8 px-6 py-4 rounded-xl bg-white/5 border border-white/5 hidden lg:block">
            <div className="text-xs text-zinc-500 font-mono">
              TubeMind v1.0.0
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              Build 2026.01.28
            </div>
          </div>
        </div>
      </aside>

      {/* 右側內容區 */}
      <main className="flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
        {activeTab === 'summary' && (
          <SummaryPreferences
            initialSettings={{
              summaryTone: (userSettings.summaryTone as SummaryPreferencesType['summaryTone']) || 'professional',
              summaryToneCustom: userSettings.summaryToneCustom,
              summaryDetail: (userSettings.summaryDetail as SummaryPreferencesType['summaryDetail']) || 'standard',
              ttsVoice: (userSettings.ttsVoice as SummaryPreferencesType['ttsVoice']) || 'female',
            }}
          />
        )}

        {activeTab === 'integration' && (
          <NotionConnect
            initialParentPageId={userSettings.notionParentPageId}
            isConnected={notionStatus.isConnected}
          />
        )}
      </main>
    </div>
  )
}
