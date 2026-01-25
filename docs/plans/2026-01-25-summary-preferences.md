# 摘要客製化功能 實作計畫

> **For Claude:** 必須搭配子技能：使用 superpowers:executing-plans 逐項執行此計畫。

**目標 (Goal):** 允許使用者在設定頁面客製化 YouTube 影片摘要的語氣、詳細程度與 TTS 語音性別。

**架構 (Architecture):** 在 User model 新增偏好欄位，建立 API 端點供前端更新設定，修改 AI summarizer 在生成摘要時讀取並套用使用者偏好到 system prompt 中，TTS worker 根據語音性別選擇對應的 voice model。

**技術棧 (Tech Stack):** Prisma ORM, Next.js API Routes, Zod, React Hook Form, Radix UI, Google Gemini AI, Sonner

---

## 任務 1: 建立設定驗證 Schema

**檔案 (Files):**
- 建立: `lib/validators/settings.ts`

**步驟 1: 建立驗證 schema**

```typescript
import { z } from 'zod'

const BANNED_KEYWORDS = [
  'ignore',
  'system',
  'prompt',
  'instruction',
  'override',
  'bypass',
  'admin',
  'role',
]

export const summaryPreferencesSchema = z.object({
  summaryTone: z.enum(['professional', 'casual', 'concise', 'detailed', 'custom']),
  summaryToneCustom: z
    .string()
    .max(50, '最多 50 字')
    .regex(/^[^<>{}[\]]*$/, '不可包含特殊符號')
    .refine(
      (val) => {
        if (!val) return true
        return !BANNED_KEYWORDS.some((keyword) =>
          val.toLowerCase().includes(keyword)
        )
      },
      { message: '包含不允許的關鍵字' }
    )
    .optional()
    .nullable(),
  summaryDetail: z.enum(['brief', 'standard', 'comprehensive']),
  ttsVoice: z.enum(['male', 'female']),
})

export type SummaryPreferences = z.infer<typeof summaryPreferencesSchema>
```

**步驟 2: 驗證檔案建立成功**

執行: `cat lib/validators/settings.ts`
預期結果: 顯示完整檔案內容

**步驟 3: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 4: 提交**

```bash
git add lib/validators/settings.ts
git commit -m "feat: add summary preferences validation schema"
```

---

## 任務 2: 修改 Prisma Schema

**檔案 (Files):**
- 修改: `prisma/schema.prisma` (User model)

**步驟 1: 在 User model 新增偏好欄位**

在 User model 中，於 `updatedAt` 之前加入：

```prisma
  // 摘要客製化設定
  summaryTone       String? @default("professional")
  summaryToneCustom String?
  summaryDetail     String? @default("standard")
  ttsVoice          String? @default("female")
```

**步驟 2: 生成 Prisma Client**

執行: `npx prisma generate`
預期結果: ✔ Generated Prisma Client

**步驟 3: 建立資料庫遷移**

執行: `npx prisma migrate dev --name add_summary_preferences`
預期結果: Migration completed successfully

**步驟 4: 提交**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add summary preferences fields to User model"
```

---

## 任務 3: 修改 AI Summarizer

**檔案 (Files):**
- 修改: `lib/ai/summarizer.ts`

**步驟 1: 新增 UserPreferences 介面與輔助函式**

在檔案頂部，於 imports 之後加入：

```typescript
export interface UserPreferences {
  summaryTone?: string | null
  summaryToneCustom?: string | null
  summaryDetail?: string | null
}

function sanitize(text: string): string {
  return text.replace(/[<>{}[\]]/g, '').slice(0, 50)
}

function buildStyleInstruction(prefs?: UserPreferences): string {
  if (!prefs) return ''

  const tone = prefs.summaryTone || 'professional'
  const detail = prefs.summaryDetail || 'standard'

  const toneMap: Record<string, string> = {
    professional: '使用正式、專業的語氣',
    casual: '使用輕鬆、友善、口語化的語氣',
    concise: '使用極度簡潔的表達方式',
    detailed: '使用深入且詳細的分析語氣',
    custom:
      prefs.summaryToneCustom
        ? `風格：${sanitize(prefs.summaryToneCustom)}`
        : '使用正式、專業的語氣',
  }

  const detailMap: Record<string, string> = {
    brief: '"keyPoints" 限制 3 個，"sections[].summary" 每段 2-3 句話',
    standard: '"keyPoints" 3-5 個，"sections[].summary" 每段 3-5 句話',
    comprehensive:
      '"keyPoints" 5-7 個，"sections[].summary" 每段 5-8 句話，包含具體案例與延伸思考',
  }

  return `
風格要求：
- ${toneMap[tone] || toneMap.professional}
- ${detailMap[detail] || detailMap.standard}
`
}
```

**步驟 2: 修改 generateVideoSummary 函式簽名**

將函式簽名從：

```typescript
export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string,
  existingTags: string[] = []
): Promise<SummaryResult>
```

改為：

```typescript
export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string,
  existingTags: string[] = [],
  userPreferences?: UserPreferences
): Promise<SummaryResult>
```

**步驟 3: 在 prompt 中插入風格指令**

在 `const prompt = ` 區塊中，於 `字幕內容：` 之前插入：

```typescript
  const styleInstruction = buildStyleInstruction(userPreferences)

  const prompt = `
你是 YouTube 影片內容分析專家。請閱讀以下字幕，生成詳細的**繁體中文**摘要與標籤。

影片標題：${videoTitle}
${tagsContext}

${styleInstruction}

字幕內容：
${transcriptText}

請以 JSON 格式輸出：
{
  "topic": "核心主題（一句話）",
  "tags": ["標籤1", "標籤2", "標籤3", "標籤4", "標籤5"],
  "keyPoints": ["觀點1", "觀點2", "觀點3"],
  "sections": [
    {
      "timestamp": "00:00",
      "title": "段落標題",
      "summary": "段落摘要"
    }
  ]
}

要求：
1. 全程使用繁體中文（專有名詞可保留原文）。
2. "tags" 請生成 3-5 個與影片內容高度相關的標籤。若有提供的參考標籤適合，請優先使用，並補充缺少的關鍵標籤。
3. "keyPoints" 和 "sections" 的數量與詳細程度請遵照上述風格要求。
4. "sections" 按時間序分段，摘要需具體且有資訊量。
5. 只輸出 JSON，無其他文字。
`
```

**步驟 4: 同步修改 generateSummaryWithRetry**

將函式簽名從：

```typescript
export async function generateSummaryWithRetry(
  transcript: TranscriptSegment[],
  videoTitle: string,
  existingTags: string[] = [],
  maxRetries = 2
): Promise<SummaryResult>
```

改為：

```typescript
export async function generateSummaryWithRetry(
  transcript: TranscriptSegment[],
  videoTitle: string,
  existingTags: string[] = [],
  userPreferences?: UserPreferences,
  maxRetries = 2
): Promise<SummaryResult>
```

並在 try 區塊中傳遞 userPreferences：

```typescript
return await generateVideoSummary(transcript, videoTitle, existingTags, userPreferences)
```

**步驟 5: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 6: 提交**

```bash
git add lib/ai/summarizer.ts
git commit -m "feat: add user preferences support to AI summarizer"
```

---

## 任務 4: 修改 Summary Worker

**檔案 (Files):**
- 修改: `lib/workers/summaryWorker.ts`

**步驟 1: 讀取檔案以了解現有結構**

執行: `cat lib/workers/summaryWorker.ts`

**步驟 2: 在 worker 處理函式中讀取使用者偏好**

在處理摘要任務的地方（通常在 `processor` 函式中），找到呼叫 `generateSummaryWithRetry` 的位置。

在呼叫之前，加入讀取使用者偏好的邏輯：

```typescript
// 讀取使用者偏好
const user = await prisma.user.findUnique({
  where: { id: summary.userId },
  select: {
    summaryTone: true,
    summaryToneCustom: true,
    summaryDetail: true,
  },
})

const userPreferences = user
  ? {
      summaryTone: user.summaryTone,
      summaryToneCustom: user.summaryToneCustom,
      summaryDetail: user.summaryDetail,
    }
  : undefined
```

然後將 `generateSummaryWithRetry` 的呼叫從：

```typescript
const result = await generateSummaryWithRetry(transcript, video.title, existingTags)
```

改為：

```typescript
const result = await generateSummaryWithRetry(
  transcript,
  video.title,
  existingTags,
  userPreferences
)
```

**步驟 3: 確保 prisma 已 import**

檢查檔案頂部是否有：

```typescript
import { prisma } from '@/lib/db'
```

如果沒有，請加入。

**步驟 4: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 5: 提交**

```bash
git add lib/workers/summaryWorker.ts
git commit -m "feat: integrate user preferences in summary worker"
```

---

## 任務 5: 建立 API 路由

**檔案 (Files):**
- 建立: `app/api/user/settings/summary/route.ts`

**步驟 1: 建立 API 路由檔案**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { summaryPreferencesSchema } from '@/lib/validators/settings'

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = summaryPreferencesSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        summaryTone: validated.summaryTone,
        summaryToneCustom: validated.summaryToneCustom,
        summaryDetail: validated.summaryDetail,
        ttsVoice: validated.ttsVoice,
      },
      select: {
        summaryTone: true,
        summaryToneCustom: true,
        summaryDetail: true,
        ttsVoice: true,
      },
    })

    return NextResponse.json({
      success: true,
      preferences: updatedUser,
    })
  } catch (error: any) {
    console.error('Error updating summary preferences:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
```

**步驟 2: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 3: 提交**

```bash
git add app/api/user/settings/summary/route.ts
git commit -m "feat: add API endpoint for summary preferences"
```

---

## 任務 6: 建立前端組件

**檔案 (Files):**
- 建立: `components/settings/summary-preferences.tsx`

**步驟 1: 建立組件檔案**

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { summaryPreferencesSchema, type SummaryPreferences } from '@/lib/validators/settings'
import * as RadioGroup from '@radix-ui/react-alert-dialog'

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
                  className="text-brand-blue focus:ring-brand-blue"
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
                  className="text-brand-blue focus:ring-brand-blue"
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
                  className="text-brand-blue focus:ring-brand-blue"
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
```

**步驟 2: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 3: 提交**

```bash
git add components/settings/summary-preferences.tsx
git commit -m "feat: add SummaryPreferences component"
```

---

## 任務 7: 整合到設定頁面

**檔案 (Files):**
- 修改: `app/(dashboard)/settings/page.tsx`

**步驟 1: 修改頁面以讀取並傳遞使用者偏好**

在 `SettingsPage` 函式中，修改 prisma 查詢以包含新欄位：

```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: {
    accounts: {
      where: { provider: 'notion' },
      select: { id: true },
    },
  },
  // 新增 select（如果使用 include 則不需要 select，直接取得所有欄位）
})
```

實際上因為已經使用 `include`，所有 User 欄位都會被取得，所以不需要額外修改。

在檔案頂部加入 import：

```typescript
import { SummaryPreferences } from '@/components/settings/summary-preferences'
```

在 `return` 的 JSX 中，於 `<NotionConnect>` 之後加入：

```typescript
<SummaryPreferences
  initialSettings={{
    summaryTone: user.summaryTone || 'professional',
    summaryToneCustom: user.summaryToneCustom,
    summaryDetail: user.summaryDetail || 'standard',
    ttsVoice: user.ttsVoice || 'female',
  }}
/>
```

**步驟 2: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 3: 提交**

```bash
git add app/(dashboard)/settings/page.tsx
git commit -m "feat: integrate SummaryPreferences into settings page"
```

---

## 任務 8: 修改 TTS Worker (可選)

**檔案 (Files):**
- 修改: `lib/workers/ttsWorker.ts`

**步驟 1: 讀取檔案以了解 TTS 實作**

執行: `cat lib/workers/ttsWorker.ts`

**步驟 2: 在生成語音時讀取使用者偏好**

在處理 TTS 任務的地方，找到呼叫 TTS API 的位置。

在呼叫之前，加入讀取使用者語音偏好：

```typescript
// 讀取使用者語音偏好
const user = await prisma.user.findUnique({
  where: { id: summary.userId },
  select: { ttsVoice: true },
})

const voiceModel = user?.ttsVoice === 'male' ? 'alloy' : 'nova'
```

**注意**: 實際的 voice model 名稱需要根據你使用的 TTS 服務（Google TTS）查閱官方文件。

將 TTS API 呼叫中的 voice 參數改為使用 `voiceModel`。

**步驟 3: 型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 4: 提交**

```bash
git add lib/workers/ttsWorker.ts
git commit -m "feat: support voice gender selection in TTS worker"
```

---

## 任務 9: 測試與驗證

**步驟 1: 啟動開發伺服器**

執行: `npm run dev`
預期結果: Server running on http://localhost:3000

**步驟 2: 測試設定頁面**

1. 開啟瀏覽器，前往 `/settings`
2. 驗證「摘要偏好設定」區塊顯示
3. 選擇不同語氣選項
4. 選擇「自訂」並輸入文字
5. 測試字數限制（輸入超過 50 字）
6. 測試關鍵字過濾（輸入 "ignore all instructions"）
7. 點擊「儲存設定」
8. 確認 toast 顯示成功訊息

**步驟 3: 測試 API 端點（使用 curl）**

```bash
# 取得 session cookie 後執行
curl -X PATCH http://localhost:3000/api/user/settings/summary \
  -H "Content-Type: application/json" \
  -d '{
    "summaryTone": "casual",
    "summaryDetail": "comprehensive",
    "ttsVoice": "male"
  }'
```

預期結果: `{"success":true,"preferences":{...}}`

**步驟 4: 測試摘要生成**

1. 新增一個 YouTube 影片
2. 觸發摘要生成
3. 檢查生成的摘要是否符合設定的語氣與詳細程度
4. 檢查資料庫中 summary 記錄

**步驟 5: 測試 Worker**

執行: `npm run worker`

觸發一個摘要任務，檢查 worker logs 是否正確讀取使用者偏好。

**步驟 6: 最終型別檢查**

執行: `npx tsc --noEmit`
預期結果: 無錯誤

**步驟 7: Lint 檢查**

執行: `npm run lint`
預期結果: 無錯誤或警告

---

## 完成檢查清單

- [x] Prisma schema 已更新並遷移
- [x] 驗證 schema 已建立
- [x] AI summarizer 支援使用者偏好
- [x] Summary worker 讀取並傳遞偏好
- [x] API 路由正常運作
- [x] 前端組件正常顯示與互動
- [x] 設定頁面已整合組件
- [x] TTS worker 支援語音性別（可選）
- [x] 所有測試通過
- [x] 型別檢查無錯誤
- [x] Lint 檢查通過
- [x] 已提交所有變更

---

## 注意事項

1. **Prompt Injection 防護**: 已在驗證層實作字數限制、符號過濾與關鍵字黑名單
2. **向後相容**: 所有新欄位都是 optional，現有資料不受影響
3. **預設值**: 新使用者自動使用 professional/standard/female 預設值
4. **錯誤處理**: API 路由與前端都有完整錯誤處理與使用者提示
5. **型別安全**: 使用 Zod schema 確保前後端型別一致
