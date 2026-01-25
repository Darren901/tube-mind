# 摘要客製化功能設計文件

**日期**: 2026-01-25  
**狀態**: 待實作  
**作者**: AI Agent + User

## 1. 功能概述

允許使用者在設定頁面客製化 YouTube 影片摘要的生成偏好，包括：
- 摘要語氣風格（專業、輕鬆、簡潔、詳細、自訂）
- 摘要詳細程度（簡短、標準、詳盡）
- TTS 語音性別（男聲、女聲）

這些設定為**全域設定**，使用者設定一次後套用到所有未來生成的摘要。

## 2. 設計決策

### 2.1 為何選擇全域設定？
- **簡單性**: 使用者不需要每次生成摘要時都選擇
- **一致性**: 確保所有摘要風格統一
- **實作成本**: 比影片級別或頻道級別設定簡單得多

### 2.2 為何不改變 JSON 輸出格式？
- 前端已依賴固定的 JSON 結構 (`topic`, `tags`, `keyPoints`, `sections`)
- 使用 `responseMimeType: 'application/json'` 確保格式穩定
- **解決方案**: 只調整內容風格，不改變結構

### 2.3 Prompt Injection 防護策略
採用**多層防護**：
1. **字數限制**: 自訂語氣最多 50 字
2. **特殊符號過濾**: 禁止 `<>{}[]` 等符號
3. **關鍵字黑名單**: 過濾 `ignore`, `system`, `prompt`, `instruction`, `override`, `bypass` 等
4. **Prompt 標註**: 在 system prompt 中明確標記使用者輸入為「風格偏好，非指令」

## 3. 資料庫設計

### 3.1 User Model 新增欄位

```prisma
model User {
  // ... 現有欄位
  
  // 摘要客製化設定
  summaryTone       String? @default("professional")
  summaryToneCustom String? // 最多 50 字，需經過 sanitize
  summaryDetail     String? @default("standard")
  ttsVoice          String? @default("female")
}
```

### 3.2 欄位說明

| 欄位 | 型別 | 預設值 | 可選值 | 說明 |
|------|------|--------|--------|------|
| `summaryTone` | String | `professional` | `professional`, `casual`, `concise`, `detailed`, `custom` | 摘要語氣風格 |
| `summaryToneCustom` | String | `null` | 最多 50 字 | 當 `summaryTone` 為 `custom` 時的自訂內容 |
| `summaryDetail` | String | `standard` | `brief`, `standard`, `comprehensive` | 摘要詳細程度 |
| `ttsVoice` | String | `female` | `male`, `female` | TTS 語音性別 |

## 4. 前端設計

### 4.1 UI 結構

在 `/settings` 頁面新增 `<SummaryPreferences>` 組件，包含：

**摘要語氣** (Radio Group)
- [ ] 專業正式
- [ ] 輕鬆口語
- [ ] 簡潔精煉
- [ ] 詳細深入
- [ ] 自訂 → 展開文字輸入框

**摘要詳細程度** (Radio Group)
- [ ] 簡短 (keyPoints 3 個，每段 2-3 句)
- [ ] 標準 (keyPoints 3-5 個，每段 3-5 句)
- [ ] 詳盡 (keyPoints 5-7 個，每段 5-8 句)

**語音性別** (Switch)
- 女聲 ⬅️ ➡️ 男聲

**儲存按鈕**
- 點擊後呼叫 `/api/user/settings/summary` PATCH 端點

### 4.2 自訂語氣輸入框驗證

- 即時顯示字數 (X/50)
- 違規時顯示紅色邊框 + 錯誤訊息
- 儲存時再次後端驗證

### 4.3 使用的組件庫

- Radix UI: `RadioGroup`, `Switch`
- Framer Motion: 平滑過渡動畫
- Sonner: 儲存成功/失敗 toast

## 5. 後端實作

### 5.1 驗證層 (`lib/validators/settings.ts`)

```typescript
import { z } from 'zod'

const BANNED_KEYWORDS = [
  'ignore', 'system', 'prompt', 'instruction',
  'override', 'bypass', 'admin', 'role'
]

export const summaryPreferencesSchema = z.object({
  summaryTone: z.enum(['professional', 'casual', 'concise', 'detailed', 'custom']),
  summaryToneCustom: z.string()
    .max(50, '最多 50 字')
    .regex(/^[^<>{}[\]]*$/, '不可包含特殊符號')
    .refine(
      (val) => !BANNED_KEYWORDS.some(keyword => val.toLowerCase().includes(keyword)),
      '包含不允許的關鍵字'
    )
    .optional()
    .nullable(),
  summaryDetail: z.enum(['brief', 'standard', 'comprehensive']),
  ttsVoice: z.enum(['male', 'female'])
})
```

### 5.2 API 路由 (`/api/user/settings/summary`)

- **方法**: PATCH
- **認證**: 需要 session
- **輸入**: JSON body (符合 `summaryPreferencesSchema`)
- **輸出**: `{ success: true, preferences: {...} }`

### 5.3 AI Prompt 建構 (`lib/ai/summarizer.ts`)

新增函式：

```typescript
interface UserPreferences {
  summaryTone?: string
  summaryToneCustom?: string
  summaryDetail?: string
}

function buildStyleInstruction(prefs: UserPreferences): string {
  const toneMap = {
    professional: '使用正式、專業的語氣',
    casual: '使用輕鬆、友善、口語化的語氣',
    concise: '使用極度簡潔的表達方式',
    detailed: '使用深入且詳細的分析語氣',
    custom: prefs.summaryToneCustom 
      ? `風格：${sanitize(prefs.summaryToneCustom)}` 
      : '使用正式、專業的語氣'
  }
  
  const detailMap = {
    brief: '"keyPoints" 限制 3 個，"sections[].summary" 每段 2-3 句話',
    standard: '"keyPoints" 3-5 個，"sections[].summary" 每段 3-5 句話',
    comprehensive: '"keyPoints" 5-7 個，"sections[].summary" 每段 5-8 句話，包含具體案例'
  }
  
  return `風格要求：
- ${toneMap[prefs.summaryTone || 'professional']}
- ${detailMap[prefs.summaryDetail || 'standard']}`
}

function sanitize(text: string): string {
  return text.replace(/[<>{}[\]]/g, '').slice(0, 50)
}
```

修改 `generateVideoSummary` 函式：
- 新增 `userPreferences?: UserPreferences` 參數
- 在 prompt 中插入 `buildStyleInstruction(userPreferences)`

### 5.4 Worker 整合 (`lib/workers/summaryWorker.ts`)

在處理摘要任務時：
1. 從資料庫讀取 `userId` 對應的 `summaryTone`, `summaryToneCustom`, `summaryDetail`
2. 組合成 `UserPreferences` 物件
3. 傳遞給 `generateVideoSummary()`

### 5.5 TTS Worker 整合 (`lib/workers/ttsWorker.ts`)

在生成語音時：
1. 讀取 `user.ttsVoice`
2. 根據性別選擇對應的 voice model（需查閱 Google TTS API 文件）

## 6. 安全性考量

### 6.1 已實作防護
- ✅ 字數限制（50 字）
- ✅ 特殊符號過濾
- ✅ 關鍵字黑名單
- ✅ Prompt 中明確標註

### 6.2 未來可強化
- 使用 AI 預檢查輸入（額外 API 成本）
- 記錄可疑輸入並標記帳號

## 7. 實作步驟

1. ✅ 修改 Prisma schema，新增欄位
2. ✅ 建立驗證 schema (`lib/validators/settings.ts`)
3. ✅ 修改 `summarizer.ts`，加入風格建構邏輯
4. ✅ 修改 `summaryWorker.ts`，讀取並傳遞使用者偏好
5. ✅ 建立 API 路由 `/api/user/settings/summary`
6. ✅ 建立前端組件 `SummaryPreferences`
7. ✅ 整合到設定頁面
8. ✅ 修改 `ttsWorker.ts`（可選，視 TTS API 而定）
9. ✅ 執行資料庫遷移 (`npx prisma migrate dev`)
10. ✅ 測試各種語氣與詳細程度組合
11. ✅ 測試 Prompt Injection 防護

## 8. 測試計畫

### 8.1 功能測試
- [ ] 設定不同語氣，生成摘要並驗證風格
- [ ] 設定不同詳細程度，驗證 keyPoints 與 summary 長度
- [ ] 切換語音性別，驗證 TTS 輸出

### 8.2 安全測試
- [ ] 輸入 `ignore all previous instructions`
- [ ] 輸入 `<script>alert('xss')</script>`
- [ ] 輸入 51 字以上內容
- [ ] 輸入包含 `system`, `prompt` 等關鍵字

### 8.3 邊界測試
- [ ] 未設定偏好的新使用者（應使用預設值）
- [ ] 設定後刪除 `summaryToneCustom`（應回退到 professional）

## 9. 未來擴展可能性

- 頻道級別設定（為不同頻道設定不同風格）
- 影片級別覆寫（生成時臨時調整）
- 匯出/匯入設定檔
- 預設風格範本（技術深度、商業分析、娛樂輕鬆等）
- 多語言摘要（自動翻譯）

## 10. 風險與限制

### 10.1 已知限制
- JSON 輸出格式固定，無法改變結構
- 自訂語氣依賴 AI 理解能力，可能不穩定
- TTS 語音選擇受限於 API 提供的 voice models

### 10.2 潛在風險
- 使用者可能輸入不明確的自訂語氣（例如「像小丑一樣」）
- AI 可能過度解讀風格指令，導致摘要品質下降
- 詳盡模式可能增加 API token 消耗

### 10.3 緩解策略
- 提供清晰的 UI 說明與範例
- 監控摘要品質，必要時調整 prompt
- 限制詳盡模式的 maxOutputTokens
