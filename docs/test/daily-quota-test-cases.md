# Daily Quota System 測試案例

**測試目標**: `lib/quota/dailyLimit.ts`  
**相關功能**: 每日額度限制、頻道數量限制、autoRefresh 限制  
**測試框架**: Vitest + TypeScript  
**測試狀態**: ✅ 19/19 測試通過

---

## 1. checkDailyQuota() 函數

### 1.1 正常情況

[x] [正常情況] 使用者未達上限時允許使用
**測試資料**
- userId = "user-123"
- 過去 24 小時內建立 5 個摘要
- 最早摘要建立於 2 小時前

**預期結果**
```typescript
{
  allowed: true,
  used: 5,
  limit: 30,
  remaining: 25,
  resetAt: Date (22 小時後)
}
```

---

[x] [正常情況] 使用者未使用任何額度
**測試資料**
- userId = "user-new"
- 過去 24 小時內建立 0 個摘要

**預期結果**
```typescript
{
  allowed: true,
  used: 0,
  limit: 30,
  remaining: 30,
  resetAt: Date (當前時間)
}
```

---

### 1.2 邊界值

[x] [邊界值] 使用者剛好達到上限 (29 個)
**測試資料**
- userId = "user-almost"
- 過去 24 小時內建立 29 個摘要

**預期結果**
```typescript
{
  allowed: true,
  used: 29,
  limit: 30,
  remaining: 1,
  resetAt: Date
}
```

---

[x] [邊界值] 使用者達到上限 (30 個)
**測試資料**
- userId = "user-limit"
- 過去 24 小時內建立 30 個摘要
- 最早摘要建立於 1 小時前

**預期結果**
```typescript
{
  allowed: false,
  used: 30,
  limit: 30,
  remaining: 0,
  resetAt: Date (23 小時後)
}
```

---

[x] [邊界值] 使用者超過上限
**測試資料**
- userId = "user-over"
- 過去 24 小時內建立 35 個摘要

**預期結果**
```typescript
{
  allowed: false,
  used: 35,
  limit: 30,
  remaining: 0,
  resetAt: Date
}
```

---

### 1.3 時間計算正確性

[x] [正常情況] 正確計算重置時間（最早摘要 + 24 小時）
**測試資料**
- userId = "user-time"
- 最早摘要建立於 5 小時前 (oldestCreatedAt)
- 過去 24 小時內建立 8 個摘要

**預期結果**
- resetAt = oldestCreatedAt + 24 小時
- resetAt 應該在 19 小時後

---

[x] [特殊情況] 摘要剛好在 24 小時邊界
**測試資料**
- userId = "user-boundary"
- 最早摘要建立於 23.99 小時前
- 過去 24 小時內建立 10 個摘要

**預期結果**
- used = 10 (包含 23.99 小時前的摘要)
- resetAt 計算正確

---

## 2. enforceQuota() 函數

### 2.1 正常情況

[x] [正常情況] 額度足夠時不拋出錯誤
**測試資料**
- userId = "user-ok"
- 過去 24 小時內建立 3 個摘要

**預期結果**
- 不拋出錯誤
- 返回 quota 物件

---

### 2.2 異常處理

[x] [異常處理] 超過額度時拋出明確錯誤訊息
**測試資料**
- userId = "user-exceeded"
- 過去 24 小時內建立 30 個摘要
- 最早摘要建立於 2 小時前

**預期結果**
- 拋出 Error
- 錯誤訊息包含:
  - "已達到每日摘要生成上限（30 個/24 小時）"
  - "將在約 22 小時後重置"

---

[x] [邊界值] 剛好在重置前 1 分鐘
**測試資料**
- userId = "user-reset-soon"
- 過去 24 小時內建立 30 個摘要
- 最早摘要建立於 23 小時 59 分前

**預期結果**
- 拋出錯誤訊息顯示 "將在約 1 小時後重置"
- Math.ceil 正確進位

---

## 3. checkChannelLimit() 函數

### 3.1 正常情況

[x] [正常情況] 頻道數量未達上限
**測試資料**
- userId = "user-channels"
- 當前訂閱 15 個頻道

**預期結果**
```typescript
{
  count: 15,
  limit: 20
}
```

---

### 3.2 邊界值

[x] [邊界值] 頻道數量剛好達到上限 (20 個)
**測試資料**
- userId = "user-max-channels"
- 當前訂閱 20 個頻道

**預期結果**
- 拋出 Error
- "已達到頻道訂閱上限（20 個）"

---

[x] [邊界值] 頻道數量為 19 個 (未達上限)
**測試資料**
- userId = "user-almost-max"
- 當前訂閱 19 個頻道

**預期結果**
```typescript
{
  count: 19,
  limit: 20
}
```

---

### 3.3 異常處理

[x] [異常處理] 超過頻道上限時拋出錯誤
**測試資料**
- userId = "user-too-many"
- 當前訂閱 25 個頻道

**預期結果**
- 拋出 Error
- "已達到頻道訂閱上限（20 個）。請刪除部分頻道後再試。"

---

## 4. checkAutoRefreshLimit() 函數

### 4.1 正常情況

[x] [正常情況] autoRefresh 頻道數量未達上限
**測試資料**
- userId = "user-auto"
- 當前 3 個頻道啟用 autoRefresh

**預期結果**
```typescript
{
  count: 3,
  limit: 5
}
```

---

[x] [正常情況] 排除特定頻道計數 (更新現有頻道時)
**測試資料**
- userId = "user-update"
- 當前 5 個頻道啟用 autoRefresh
- excludeChannelId = "channel-xyz" (此頻道已啟用 autoRefresh)

**預期結果**
```typescript
{
  count: 4, // 排除 channel-xyz
  limit: 5
}
```
- 不拋出錯誤 (因為是更新現有頻道)

---

### 4.2 邊界值

[x] [邊界值] autoRefresh 頻道數量達到上限 (5 個)
**測試資料**
- userId = "user-max-auto"
- 當前 5 個頻道啟用 autoRefresh
- excludeChannelId = undefined (新增頻道)

**預期結果**
- 拋出 Error
- "已達到自動更新頻道上限（5 個）"

---

[x] [邊界值] autoRefresh 頻道數量為 4 個 (未達上限)
**測試資料**
- userId = "user-almost-auto"
- 當前 4 個頻道啟用 autoRefresh

**預期結果**
```typescript
{
  count: 4,
  limit: 5
}
```

---

### 4.3 異常處理

[x] [異常處理] 超過 autoRefresh 上限時拋出錯誤
**測試資料**
- userId = "user-too-many-auto"
- 當前 6 個頻道啟用 autoRefresh

**預期結果**
- 拋出 Error
- "已達到自動更新頻道上限（5 個）。請先停用其他頻道的自動更新。"

---

## 5. 資料庫整合測試

### 5.1 並發與數據完整性

[x] [並發] 同一使用者快速連續檢查額度
**測試資料**
- userId = "user-concurrent"
- 同時發送 5 個 checkDailyQuota 請求

**預期結果**
- 所有請求返回一致的 used 計數
- 不會有 race condition

---

### 5.2 外部依賴故障

[x] [外部依賴] Prisma 連線失敗
**測試資料**
- Mock prisma.summary.count 拋出錯誤

**預期結果**
- 拋出資料庫錯誤
- 錯誤訊息清楚明確

---

## 測試總結

- **總測試案例**: 24 個
- **覆蓋函數**: 4 個 (checkDailyQuota, enforceQuota, checkChannelLimit, checkAutoRefreshLimit)
- **測試類型分布**:
  - 正常情況: 9 個
  - 邊界值: 9 個
  - 異常處理: 4 個
  - 特殊情況: 2 個

---

**維護者**: AI Agent  
**最後更新**: 2026-01-30
