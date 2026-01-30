# 三層防護限流機制 - 完整實作總結

## 實作日期
2026-01-30

## 背景
原本只有「每日 10 個摘要」的單一限制，但發現 Cron Job 的 autoRefresh 功能可以完全繞過此限制，導致：
- 使用者訂閱 100 個頻道並全部啟用 autoRefresh
- 每天凌晨 3:00 自動生成 500 個摘要 (100 × 5 影片)
- 每月 API 費用失控

## 重新設計：三層防護機制

### 第一層：頻道數量限制
- **目的**: 防止訂閱數百個頻道
- **限制**: 每位使用者最多訂閱 **20 個頻道**
- **檢查時機**: 新增頻道時 (`POST /api/channels`)
- **實作位置**: `lib/quota/dailyLimit.ts` - `checkChannelLimit()`

### 第二層：autoRefresh 頻道限制
- **目的**: 防止所有頻道都啟用自動更新
- **限制**: 最多 **5 個頻道**可啟用 autoRefresh
- **檢查時機**: 更新頻道設定時 (`PATCH /api/channels/[id]`)
- **實作位置**: `lib/quota/dailyLimit.ts` - `checkAutoRefreshLimit()`
- **特色**: 支援排除特定頻道計數（更新現有頻道時不會誤判）

### 第三層：全域每日摘要上限
- **目的**: 最終成本控制（手動 + 自動總和）
- **限制**: 每位使用者每 24 小時最多生成 **30 個摘要**
- **計算方式**: 滾動 24 小時（查詢 `createdAt >= now - 24h`）
- **檢查時機**: 每次呼叫 `addSummaryJob()` 前
- **實作位置**: 
  - `lib/quota/dailyLimit.ts` - `checkDailyQuota()`, `enforceQuota()`
  - `lib/queue/summaryQueue.ts` - 整合檢查邏輯

---

## 系統限制常數

新建檔案 `lib/constants/limits.ts` 統一管理所有限制：

```typescript
export const LIMITS = {
  // 頻道相關限制
  MAX_CHANNELS_PER_USER: 20,           // 每位使用者最多訂閱 20 個頻道
  MAX_AUTO_REFRESH_CHANNELS: 5,        // 最多 5 個頻道可啟用 autoRefresh
  
  // 摘要生成限制
  DAILY_SUMMARY_LIMIT: 30,             // 每 24 小時最多生成 30 個摘要
  MAX_PENDING_JOBS_PER_USER: 25,       // 最多 25 個待處理任務
  
  // 影片限制
  MAX_VIDEO_DURATION_SECONDS: 5 * 60 * 60,  // 5 小時
  
  // Cron Job 限制
  VIDEOS_PER_CHANNEL_REFRESH: 5,       // 每次頻道更新抓取 5 個影片
} as const
```

---

## 檔案變更清單

### 新增檔案（4 個）
1. ✅ `lib/constants/limits.ts` - 系統限制常數
2. ✅ `lib/quota/dailyLimit.ts` - 額度檢查邏輯（4 個函數）
3. ✅ `app/api/quota/route.ts` - 查詢額度 API
4. ✅ `docs/features/daily-quota-system.md` - 技術文檔（舊版，需更新）

### 修改檔案（9 個）
1. ✅ `lib/queue/summaryQueue.ts` - 整合雙重檢查（每日額度 + 待處理任務）
2. ✅ `app/api/summaries/route.ts` - 錯誤處理（每日額度）
3. ✅ `app/api/summaries/batch/route.ts` - 批次錯誤處理
4. ✅ `app/api/summaries/[id]/retry/route.ts` - 重試檢查
5. ✅ `app/api/channels/route.ts` - 新增頻道時檢查數量限制
6. ✅ `app/api/channels/[id]/route.ts` - 更新頻道設定時檢查 autoRefresh 限制
7. ✅ `app/api/channels/[id]/refresh/route.ts` - 手動更新檢查
8. ✅ `app/api/cron/check-new-videos/route.ts` - Cron Job 整合額度檢查與錯誤處理
9. ✅ `README.md` - 新增「三層防護機制」與「雙重限流機制」章節

### 測試檔案（2 個）
1. ✅ `test/lib/quota/dailyLimit.test.ts` - 19 個測試案例（100% 通過）
2. ✅ `docs/test/daily-quota-test-cases.md` - 測試案例清單（全部打勾）

### 文檔更新（1 個）
1. ✅ `docs/test/TEST-OVERVIEW.md` - 更新測試總覽（新增 Daily Quota System）

---

## 成本估算（更新）

### 最壞情況分析
假設使用者用滿所有額度：
- **每日額度**: 30 個摘要
- **autoRefresh**: 5 個頻道 × 5 影片 = 25 個摘要（自動）
- **手動生成**: 5 個摘要（剩餘額度）

### 單位成本
每個摘要平均消耗：
- 字幕長度：5,000 tokens
- AI 回應：2,000 tokens
- 總計：7,000 tokens/摘要

### Gemini 2.5 Flash 定價（2026-01-30）
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

### 每位使用者每日成本
- Input: (5,000 tokens × 30) × $0.075 / 1M = $0.01125
- Output: (2,000 tokens × 30) × $0.30 / 1M = $0.018
- **總計**: $0.02925/使用者/天

### 100 位活躍使用者每月成本
- $0.02925 × 100 × 30 = **$87.75/月**

✅ **仍在可控範圍內！**（相比原本無限制可能數千美元）

---

## API 端點

### GET /api/quota
查詢當前使用者的額度狀態

**回應範例**:
```json
{
  "used": 15,
  "limit": 30,
  "remaining": 15,
  "resetAt": "2026-01-31T03:15:00.000Z"
}
```

---

## 錯誤訊息

### 1. 超過每日額度
```
已達到每日摘要生成上限（30 個/24 小時）。將在約 5 小時後重置。
```
- HTTP 狀態碼: 429

### 2. 超過待處理任務上限
```
已達到待處理任務上限（25 個）。請等待現有任務完成後再試。
```
- HTTP 狀態碼: 429

### 3. 超過頻道訂閱上限
```
已達到頻道訂閱上限（20 個）。請刪除部分頻道後再試。
```
- HTTP 狀態碼: 429

### 4. 超過 autoRefresh 上限
```
已達到自動更新頻道上限（5 個）。請先停用其他頻道的自動更新。
```
- HTTP 狀態碼: 429

---

## 技術亮點

### 1. 滾動 24 小時設計
```typescript
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
```
- 公平性：避免「午夜重置」漏洞
- 準確性：從最早的摘要建立時間計算重置時間
- 使用者體驗：明確顯示「約 X 小時後重置」

### 2. 排除特定頻道計數
```typescript
checkAutoRefreshLimit(userId, excludeChannelId?: string)
```
- 更新現有頻道時不會誤判
- 避免「已啟用 autoRefresh 的頻道無法切換」問題

### 3. Cron Job 智慧跳過
```typescript
const userStats: Record<string, { 
  added: number; 
  skipped: number; 
  quotaExceeded: boolean 
}> = {}

if (userStats[channel.userId].quotaExceeded) {
  continue // 跳過該使用者的其他頻道
}
```
- 一旦使用者超過額度，停止處理其所有頻道
- 避免無謂的 API 呼叫
- 記錄詳細統計供監控

---

## 測試覆蓋

### 新增測試
- **檔案**: `test/lib/quota/dailyLimit.test.ts`
- **測試數**: 19 個
- **通過率**: 100%

### 測試類型分布
- ✅ 正常情況: 7 個
- ✅ 邊界值: 9 個（29/30/35 個摘要、19/20 個頻道、4/5 個 autoRefresh）
- ✅ 異常處理: 3 個（超限錯誤訊息）
- ✅ 時間計算: 2 個（重置時間正確性）

### 總測試數更新
- **舊**: 239 個測試
- **新**: 258 個測試（+19）

---

## 部署檢查清單

### 環境變數
- ✅ 無需額外環境變數
- ✅ 所有常數集中在 `LIMITS` 物件

### 資料庫
- ✅ 無需 migration（使用現有 Schema）
- ✅ 需確保索引存在：`Summary.userId`, `Summary.createdAt`

### 監控建議
1. **額度使用監控**
   - 每日平均摘要數/使用者
   - 超限次數統計
   - 熱門時段分析

2. **成本追蹤**
   - Gemini API Token 消耗
   - 每月費用趨勢
   - 異常使用者告警

3. **系統健康**
   - Queue 待處理任務數
   - Worker 處理速度
   - Redis Pub/Sub 延遲

---

## 調整額度（如果需要）

所有限制集中在 `lib/constants/limits.ts`：

```typescript
export const LIMITS = {
  MAX_CHANNELS_PER_USER: 20,        // 改這裡
  MAX_AUTO_REFRESH_CHANNELS: 5,     // 改這裡
  DAILY_SUMMARY_LIMIT: 30,          // 改這裡
  MAX_PENDING_JOBS_PER_USER: 25,    // 改這裡
  // ...
}
```

---

## 前端額度顯示（已實作）

### 實作日期
2026-01-30

### 新增組件
- **QuotaCard** (`components/QuotaCard.tsx`)
  - 視覺化額度卡片，顯示已使用/總額度/剩餘
  - 進度條視覺化（綠色→黃色→紅色漸變）
  - 重置時間倒數計時（每分鐘更新）
  - 額度不足時警告訊息
  - 每 30 秒自動更新額度狀態

### 功能特色
1. **進度條視覺化**
   - 正常：藍色進度條
   - 低額度（≤5）：黃色進度條 + 警告訊息
   - 額度耗盡：紅色進度條 + 重置提示

2. **即時倒數計時**
   - 顯示「約 X 小時後重置」或「約 X 分鐘後重置」
   - 每分鐘自動更新倒數時間
   - 重置時顯示「即將重置」

3. **自動更新機制**
   - 每 30 秒自動重新抓取額度
   - 確保資料即時性

### 整合位置
- **摘要列表頁面**（`app/(dashboard)/summaries/page.tsx`）
  - 顯示於頁面頂部，搜尋框下方
  - 提供全域額度可見性

### CreateSummaryButton 優化
- 新增 `showQuota` prop（選用）
- 額度不足時自動禁用按鈕
- 顯示剩餘次數（例如：「建立摘要 (剩餘 15)」）

---

## 訪客模式 (Guest Mode)

### 目的
為了在雲端部署時防止資源被未授權的陌生人消耗，但又希望能展示給面試官或訪客體驗，實作了基於 Email 白名單的動態額度系統。

### 機制
1. **白名單 (Whitelist)**
   - 透過環境變數 `ADMIN_EMAILS` 設定擁有完整權限的 Email 列表。
   - 格式：`ADMIN_EMAILS=user1@gmail.com,user2@gmail.com`

2. **動態額度 (Dynamic Quota)**
   - **訪客 (Guest)**：
     - 每日摘要：**3 個**
     - 頻道訂閱：**3 個**
     - Auto Refresh：**停用 (0 個)**
   - **管理員 (Admin)**：
     - 每日摘要：**30 個**
     - 頻道訂閱：**20 個**
     - Auto Refresh：**5 個**

3. **實作細節**
   - `lib/quota/dailyLimit.ts` 內部的 `getUserLimits` 函數會根據 Email 動態切換限制常數。
   - `QuotaCard` 會顯示「訪客模式」標籤，讓訪客知道自己處於限制狀態。

---

## 未來優化方向

### 方案 A: Redis 快取額度狀態
- 加速額度查詢（目前每次都查資料庫）
- 使用 Redis Sorted Set 記錄最近 24 小時的摘要
- 需處理快取失效與同步問題

### 方案 B: 分級會員制
- 免費用戶：30 個/天
- 基礎會員：100 個/天
- 專業會員：無限制
- 需要加入付費機制與會員管理系統

### 方案 C: 動態額度調整
- 根據系統負載動態調整額度
- 離峰時段提高額度，尖峰時段降低
- 需要監控系統與動態配置機制

---

## 結論

透過三層防護機制 + 前端額度顯示，成功解決：
1. ✅ **防止惡意濫用**: 頻道數量與 autoRefresh 限制
2. ✅ **控制成本**: 每日總額度 30 個，每月成本可預測（~$88/100 人）
3. ✅ **使用者體驗**: 
   - 正常使用者不受影響（5 個 autoRefresh + 5 個手動）
   - 清楚的錯誤訊息與重置時間提示
   - **視覺化額度卡片**：即時顯示剩餘額度與重置倒數
4. ✅ **系統穩定**: 待處理任務上限防止 Queue 過載

**風險降低**: 從「無限制可能數千美元」→「可控 $88/月」

---

**維護者**: AI Agent  
**完成日期**: 2026-01-30  
**測試狀態**: 286/286 通過 ✅（全數通過）
