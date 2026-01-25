'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { summaryPreferencesSchema, type SummaryPreferences } from '@/lib/validators/settings'

interface SummaryPreferencesProps {
  initialSettings: SummaryPreferences
}

export function SummaryPreferences({ initialSettings }: SummaryPreferencesProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(
    initialSettings.summaryTone === 'custom'
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SummaryPreferences>({
    resolver: zodResolver(summaryPreferencesSchema),
    defaultValues: initialSettings,
  })

  const summaryTone = watch('summaryTone')
  const customText = watch('summaryToneCustom')

  // 監聽語氣變化
  if (summaryTone === 'custom' && !showCustomInput) {
    setShowCustomInput(true)
  } else if (summaryTone !== 'custom' && showCustomInput) {
    setShowCustomInput(false)
  }

  const onSubmit = async (data: SummaryPreferences) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/settings/summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('儲存失敗')
      }

      toast.success('摘要偏好已更新')
    } catch (error) {
      console.error(error)
      toast.error('更新失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">摘要偏好設定</h2>
      <p className="text-sm text-zinc-400 mb-6">
        客製化影片摘要的語氣、詳細程度與語音性別
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 摘要語氣 */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-3 block">
            摘要語氣
          </label>
          <div className="space-y-2">
            {[
              { value: 'professional', label: '專業正式' },
              { value: 'casual', label: '輕鬆口語' },
              { value: 'concise', label: '簡潔精煉' },
              { value: 'detailed', label: '詳細深入' },
              { value: 'custom', label: '自訂' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register('summaryTone')}
                  className="mr-2 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm text-zinc-300">{option.label}</span>
              </label>
            ))}
          </div>

          {showCustomInput && (
            <div className="mt-3">
              <input
                type="text"
                {...register('summaryToneCustom')}
                placeholder="例如：像老師一樣講解"
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-red-400">
                  {errors.summaryToneCustom?.message}
                </p>
                <p className="text-xs text-zinc-500">
                  {customText?.length || 0}/50
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 摘要詳細程度 */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-3 block">
            詳細程度
          </label>
          <div className="space-y-2">
            {[
              { value: 'brief', label: '簡短 (3 個重點，每段 2-3 句)' },
              { value: 'standard', label: '標準 (3-5 個重點，每段 3-5 句)' },
              { value: 'comprehensive', label: '詳盡 (5-7 個重點，每段 5-8 句)' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register('summaryDetail')}
                  className="mr-2 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm text-zinc-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 語音性別 */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-3 block">
            語音性別
          </label>
          <div className="space-y-2">
            {[
              { value: 'female', label: '女聲' },
              { value: 'male', label: '男聲' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register('ttsVoice')}
                  className="mr-2 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm text-zinc-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 儲存按鈕 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '儲存中...' : '儲存設定'}
        </button>
      </form>
    </div>
  )
}
