# 前端額度顯示功能

## 實作日期
2026-01-30

## 功能概述

提供視覺化的每日摘要額度顯示，讓使用者清楚知道還剩多少額度可以使用，以及何時重置。

---

## 組件說明

### QuotaCard (`components/QuotaCard.tsx`)

**用途**：顯示當前使用者的每日摘要額度狀態

**功能特色**：
- 🎨 **視覺化進度條**：動態顏色（綠→黃→紅）反映額度狀態
- ⏰ **重置倒數計時**：顯示「約 X 小時後重置」，每分鐘更新
- 🔄 **自動更新**：每 30 秒自動重新抓取額度
- ⚠️ **警告訊息**：額度不足時顯示明確提示

**狀態顏色邏輯**：
```typescript
正常（剩餘 > 5）：藍色進度條
低額度（剩餘 ≤ 5）：黃色進度條 + 警告訊息
額度耗盡（剩餘 = 0）：紅色進度條 + 重置倒數
```

**使用範例**：
```tsx
import { QuotaCard } from '@/components/QuotaCard'

export default function Page() {
  return (
    <div>
      <QuotaCard />
    </div>
  )
}
```

---

### CreateSummaryButton 優化

**新增 Props**：
- `showQuota?: boolean` - 是否顯示剩餘額度（預設 `false`）

**功能增強**：
1. 額度不足時自動禁用按鈕
2. 顯示剩餘次數（例如：「建立摘要 (剩餘 15)」）
3. 自動抓取額度狀態

**使用範例**：
```tsx
// 智慧型按鈕：自動從 Context 讀取額度，額度滿時自動禁用
// 預設不顯示文字（僅禁用）
<CreateSummaryButton videoId="abc123" />

// 強制顯示剩餘次數文字
<CreateSummaryButton videoId="abc123" showQuota />
```

---

## 架構優化：QuotaProvider

為了避免多個按鈕同時查詢 API 導致效能問題，採用 React Context 模式。

### QuotaContext (`components/providers/QuotaProvider.tsx`)
- **職責**：全域額度狀態管理
- **更新機制**：每 60 秒自動輪詢 API
- **即時刷新**：提供 `refreshQuota()` 方法供操作後立即更新

### 整合方式
`app/(dashboard)/layout.tsx` 包裹了 `QuotaProvider`，確保所有 Dashboard 頁面都能存取額度狀態。

---

## 整合位置

### 1. 摘要列表頁面
**檔案**：`app/(dashboard)/summaries/page.tsx`
- 顯示 `QuotaCard`

### 2. 頻道詳情頁面
**檔案**：`app/(dashboard)/channels/[id]/page.tsx`
- 頁面頂部顯示 `QuotaCard`
- 列表中的 `CreateSummaryButton` 自動感知額度狀態

---

## API 端點

### GET /api/quota

**回應格式**：
```json
{
  "used": 15,
  "limit": 30,
  "remaining": 15,
  "resetAt": "2026-01-31T03:15:00.000Z"
}
```

**說明**：
- `used`：過去 24 小時已使用的摘要數量
- `limit`：每日總額度
- `remaining`：剩餘額度（`limit - used`）
- `resetAt`：最早摘要的建立時間 + 24 小時

---

## 技術實作細節

### 1. 時間計算

```typescript
// 計算重置時間
const now = new Date()
const reset = new Date(quota.resetAt!)
const diff = reset.getTime() - now.getTime()

// 轉換為小時或分鐘
const hours = Math.floor(diff / (1000 * 60 * 60))
const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

// 顯示文字
if (hours > 0) {
  return `約 ${hours} 小時後重置`
} else if (minutes > 0) {
  return `約 ${minutes} 分鐘後重置`
} else {
  return '即將重置'
}
```

### 2. 自動更新機制

```typescript
useEffect(() => {
  fetchQuota() // 首次載入
  const interval = setInterval(fetchQuota, 30000) // 每 30 秒
  return () => clearInterval(interval) // 清理
}, [])
```

### 3. 倒數計時更新

```typescript
useEffect(() => {
  updateCountdown() // 首次計算
  const interval = setInterval(updateCountdown, 60000) // 每分鐘
  return () => clearInterval(interval) // 清理
}, [quota?.resetAt])
```

---

## 使用者體驗

### 正常狀態（剩餘 > 5）
```
┌─────────────────────────────────┐
│ 🔵 每日額度       約 5 小時後重置 │
├─────────────────────────────────┤
│ ████████████████░░░░░░░░░░ 60%  │
├─────────────────────────────────┤
│ 已使用    總額度    剩餘          │
│   18       30      12           │
└─────────────────────────────────┘
```

### 低額度警告（剩餘 ≤ 5）
```
┌─────────────────────────────────┐
│ 🟡 每日額度       約 3 小時後重置 │
├─────────────────────────────────┤
│ ████████████████████████░ 83%   │
├─────────────────────────────────┤
│ 已使用    總額度    剩餘          │
│   25       30       5           │
├─────────────────────────────────┤
│ ⚠️  額度即將用盡（剩餘 5 個）。   │
│     約 3 小時後將重置。          │
└─────────────────────────────────┘
```

### 額度耗盡（剩餘 = 0）
```
┌─────────────────────────────────┐
│ 🔴 每日額度       約 2 小時後重置 │
├─────────────────────────────────┤
│ ████████████████████████████ 100%│
├─────────────────────────────────┤
│ 已使用    總額度    剩餘          │
│   30       30       0           │
├─────────────────────────────────┤
│ 🚫 已達到每日額度上限。           │
│     約 2 小時後即可繼續使用。     │
└─────────────────────────────────┘
```

---

## 檔案清單

### 新增檔案
- `components/QuotaCard.tsx` - 額度顯示卡片組件

### 修改檔案
- `components/CreateSummaryButton.tsx` - 新增 `showQuota` prop
- `app/(dashboard)/summaries/page.tsx` - 整合 QuotaCard

---

## 未來優化方向

### 1. 在其他頁面顯示額度
- 頻道列表頁面（小型額度徽章）
- 新增摘要頁面（明確警告）

### 2. 更多視覺化選項
- 圓環圖（Donut Chart）
- 迷你進度條（在導航列）

### 3. 通知機制
- 額度剩餘 5 個時推送通知
- 額度重置後通知使用者

---

**維護者**: AI Agent  
**完成日期**: 2026-01-30  
**相關文檔**: `docs/features/quota-system-final.md`
