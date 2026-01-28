'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { summaryPreferencesSchema, type SummaryPreferences } from '@/lib/validators/settings'
import {
  Bot,
  Coffee,
  Zap,
  BookOpen,
  PenTool,
  Mic,
  Play,
  Check,
  Sparkles,
  AlignLeft,
  List,
  FileText
} from 'lucide-react'

interface SummaryPreferencesProps {
  initialSettings: SummaryPreferences
}

const TONE_OPTIONS = [
  { value: 'professional', label: '專業正式', icon: Bot, description: '客觀、學術，適合學習與研究' },
  { value: 'casual', label: '輕鬆口語', icon: Coffee, description: '像朋友聊天，適合休閒觀看' },
  { value: 'concise', label: '簡潔精煉', icon: Zap, description: '只列重點，最節省時間' },
  { value: 'detailed', label: '詳細深入', icon: BookOpen, description: '涵蓋所有細節，完整還原' },
  { value: 'custom', label: '自訂風格', icon: PenTool, description: '自行定義 AI 的語氣與角色' },
]

const DETAIL_OPTIONS = [
  { value: 'brief', label: '簡短摘要', icon: AlignLeft, points: '3 個重點', desc: '快速瀏覽核心概念' },
  { value: 'standard', label: '標準長度', icon: List, points: '3-5 個重點', desc: '平衡細節與閱讀時間' },
  { value: 'comprehensive', label: '詳盡解析', icon: FileText, points: '5-7 個重點', desc: '不錯過任何精彩內容' },
]

const VOICE_OPTIONS = [
  { value: 'female', label: '女聲 (Standard)', color: 'bg-pink-500/20 text-pink-400' },
  { value: 'male', label: '男聲 (Standard)', color: 'bg-blue-500/20 text-blue-400' },
]

// 模擬預覽資料
const PREVIEW_CONTENT = {
  title: "如何沖煮完美的 V60 手沖咖啡",
  channel: "Coffee Master",
  professional: "本影片深入探討 V60 手沖咖啡的萃取變因。關鍵在於控制水溫 (90-93°C) 與粉水比 (1:15)。講者演示了分段注水法：首先進行 30 秒悶蒸以釋放二氧化碳，隨後穩定注水以維持萃取率。適當的攪拌可增加甜感與體質感。",
  casual: "想在家沖出好喝的咖啡嗎？這支影片教你幾個超實用的小撇步！首先，水溫很重要喔，大概 90 度左右最好。別忘了先悶蒸 30 秒，讓咖啡粉「呼吸」一下。按照 1:15 的比例慢慢注水，你也能沖出咖啡店等級的美味！☕",
  concise: "1. 最佳水溫：90-93°C。\n2. 黃金粉水比：1:15。\n3. 關鍵步驟：悶蒸 30 秒釋放氣體，穩定分段注水。",
  detailed: "本教學詳細拆解 V60 沖煮流程：\n1. **準備工作**：研磨度建議為中細研磨 (類似砂糖)，水溫控制在 90-93°C。\n2. **悶蒸階段**：注入 2 倍粉重的水量，悶蒸 30 秒，此步驟對於釋放二氧化碳至關重要。\n3. **注水技巧**：採用中心繞圈注水，避免沖到濾紙邊緣。建議分兩次注水，第一次帶出酸值，第二次增加甜感。\n4. **結尾**：總萃取時間控制在 2:30 左右，最後輕微搖晃濾杯使粉床平整。",
  custom: "（AI 將依照您的指示生成摘要...）例如：嘿！這裡是你的咖啡教練。今天的課程是 V60！記住兩個數字：92度和1:15。別手抖，穩穩地繞圈圈注水，讓咖啡粉吸飽水分，那香味絕對讓你醒過來！"
}

export function SummaryPreferences({ initialSettings }: SummaryPreferencesProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SummaryPreferences>({
    resolver: zodResolver(summaryPreferencesSchema),
    defaultValues: initialSettings,
  })

  const currentTone = watch('summaryTone')
  const currentDetail = watch('summaryDetail')
  const currentVoice = watch('ttsVoice')
  const customText = watch('summaryToneCustom')

  const onSubmit = async (data: SummaryPreferences) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/settings/summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('儲存失敗')
      toast.success('摘要偏好已更新')
    } catch (error) {
      console.error(error)
      toast.error('更新失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // 取得預覽文字
  const getPreviewText = () => {
    if (currentTone === 'custom') return PREVIEW_CONTENT.custom
    // @ts-ignore
    return PREVIEW_CONTENT[currentTone] || PREVIEW_CONTENT.professional
  }

  // 根據詳細程度調整預覽長度 (模擬)
  const getPreviewPoints = () => {
    const text = getPreviewText()
    if (currentTone === 'concise' || currentTone === 'detailed') return text // 這些風格本身就決定了長度

    // 對於 casual 和 professional，我們模擬長度變化
    if (currentDetail === 'brief') return text.split('。')[0] + '。'
    if (currentDetail === 'comprehensive') return text + " 此外，講者還提到了磨豆機的重要性，建議使用鬼齒刀盤以獲得更均勻的顆粒。"
    return text
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 左側：設定表單 */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold font-rajdhani text-white mb-2">摘要偏好設定</h2>
          <p className="text-text-secondary font-ibm">
            打造專屬於您的 AI 學習助手，調整摘要風格與語音。
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* 1. 摘要語氣 */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-rajdhani flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              摘要語氣 (Tone)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TONE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setValue('summaryTone', option.value as any)}
                  className={`
                    relative cursor-pointer rounded-xl border p-4 transition-all duration-200
                    ${currentTone === option.value
                      ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${currentTone === option.value ? 'bg-brand-blue text-white' : 'bg-white/5 text-text-secondary'}`}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm mb-1">{option.label}</div>
                      <div className="text-xs text-text-secondary leading-relaxed">{option.description}</div>
                    </div>
                  </div>
                  {currentTone === option.value && (
                    <div className="absolute top-3 right-3 text-brand-blue">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 自訂語氣輸入框 */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${currentTone === 'custom' ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="bg-zinc-900/50 border border-brand-blue/30 rounded-xl p-4">
                <label className="text-xs text-brand-blue mb-2 block font-medium">自訂 AI 角色指令</label>
                <input
                  type="text"
                  {...register('summaryToneCustom')}
                  placeholder="例如：像賈伯斯一樣充滿熱情地介紹..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/50 placeholder:text-zinc-600 font-ibm"
                />
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-red-400">{errors.summaryToneCustom?.message}</span>
                  <span className="text-zinc-500">{customText?.length || 0}/50</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 詳細程度 */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-rajdhani flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-brand-blue" />
              詳細程度 (Length)
            </h3>
            <div className="space-y-3">
              {DETAIL_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setValue('summaryDetail', option.value as any)}
                  className={`
                    relative cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200 flex items-center justify-between group
                    ${currentDetail === option.value
                      ? 'bg-brand-blue/10 border-brand-blue'
                      : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <option.icon className={`w-5 h-5 ${currentDetail === option.value ? 'text-brand-blue' : 'text-zinc-500'}`} />
                    <div>
                      <div className={`font-medium text-sm ${currentDetail === option.value ? 'text-white' : 'text-zinc-300'}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-zinc-500">{option.desc}</div>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${currentDetail === option.value ? 'bg-brand-blue/20 border-brand-blue/30 text-brand-blue' : 'bg-white/5 border-white/5 text-zinc-500'}`}>
                    {option.points}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. 語音設定 */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-rajdhani flex items-center gap-2">
              <Mic className="w-4 h-4 text-brand-blue" />
              語音設定 (TTS)
            </h3>
            <div className="flex gap-4">
              {VOICE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setValue('ttsVoice', option.value as any)}
                  className={`
                    flex-1 cursor-pointer rounded-xl border p-4 transition-all duration-200 text-center
                    ${currentVoice === option.value
                      ? 'bg-white/5 border-brand-blue ring-1 ring-brand-blue/50'
                      : 'bg-zinc-900/50 border-white/5 hover:bg-white/5'}
                  `}
                >
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-3 ${option.color}`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="font-medium text-white text-sm">{option.label}</div>
                  <div className="text-xs text-zinc-500 mt-1">Google WaveNet</div>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed font-rajdhani tracking-wide text-lg"
            >
              {isLoading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>

      {/* 右側：即時預覽 */}
      <div className="hidden lg:block relative">
        <div className="sticky top-24">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue/20 to-purple-500/20 rounded-2xl blur-2xl opacity-50" />

          <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* 預覽標題列 */}
            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Live Preview</span>
            </div>

            {/* 模擬播放器 */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-b from-transparent to-black/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-zinc-800 flex-shrink-0 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-brand-blue/20 flex items-center justify-center group-hover:bg-brand-blue/30 transition-colors cursor-pointer">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">如何沖煮完美的 V60 手沖咖啡</h4>
                  <p className="text-zinc-500 text-xs truncate">Coffee Master • 12:45</p>
                </div>
              </div>

              {/* 模擬音訊條 */}
              <div className="mt-4 bg-zinc-800/50 rounded-full p-2 flex items-center gap-3">
                <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentVoice === 'female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-white/30 rounded-full" />
                </div>
                <span className="text-xs text-zinc-500 font-mono">00:12</span>
              </div>
            </div>

            {/* 預覽內容區 */}
            <div className="p-6 min-h-[400px] transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className={`px-2 py-0.5 rounded text-xs font-medium border ${currentTone === 'professional' ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' :
                  currentTone === 'casual' ? 'bg-green-900/20 text-green-400 border-green-800/30' :
                    currentTone === 'concise' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30' :
                      'bg-purple-900/20 text-purple-400 border-purple-800/30'
                  }`}>
                  {TONE_OPTIONS.find(t => t.value === currentTone)?.label}
                </div>
                <div className="text-xs text-zinc-500">
                  {DETAIL_OPTIONS.find(d => d.value === currentDetail)?.label}
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none">
                <p className="font-ibm leading-relaxed text-zinc-300 whitespace-pre-line animate-in fade-in duration-500 key={currentTone + currentDetail}">
                  {getPreviewPoints()}
                </p>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-2 bg-zinc-800 rounded-full animate-pulse" style={{ width: `${Math.random() * 40 + 20}%`, animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
