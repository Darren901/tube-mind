# 訪客模式 (Guest Mode) 測試案例

**測試目標**: `lib/quota/dailyLimit.ts` 中的動態額度邏輯
**相關功能**: 訪客/管理員權限區分、Email 白名單、動態額度限制
**測試框架**: Vitest + TypeScript
**測試狀態**: ✅ 14/14 測試通過

---

## 1. 權限識別 (Identify User Role)

### 1.1 訪客識別
[x] [正常情況] 非白名單 Email 視為訪客
**測試資料**
- userId = "user-guest"
- email = "guest@example.com"
- ADMIN_EMAILS = "admin@example.com"

**預期結果**
- 使用 `GUEST_LIMITS`
- isGuest = true

---

### 1.2 管理員識別
[x] [正常情況] 白名單 Email 視為管理員
**測試資料**
- userId = "user-admin"
- email = "admin@example.com"
- ADMIN_EMAILS = "admin@example.com"

**預期結果**
- 使用 `ADMIN_LIMITS`
- isGuest = false (isAdmin = true)

---

### 1.3 環境變數解析
[x] [邊界值] ADMIN_EMAILS 解析（多個 Email 含空格）
**測試資料**
- userId = "user-admin-2"
- email = "admin2@example.com"
- ADMIN_EMAILS = "admin1@example.com, admin2@example.com ,admin3@example.com"

**預期結果**
- 視為管理員 (isAdmin = true)
- 正確去除空格

[x] [異常處理] ADMIN_EMAILS 未設定或為空
**測試資料**
- userId = "user-any"
- email = "any@example.com"
- ADMIN_EMAILS = "" 或 undefined

**預期結果**
- 所有使用者視為訪客

---

## 2. 每日摘要額度 (Daily Summary Limit)

### 2.1 訪客限制 (3 個)
[x] [正常情況] 訪客使用量未達 3 個
**測試資料**
- isGuest = true
- used = 2

**預期結果**
- allowed: true
- limit: 3
- remaining: 1

[x] [邊界值] 訪客使用量達到 3 個
**測試資料**
- isGuest = true
- used = 3

**預期結果**
- allowed: false
- limit: 3
- remaining: 0
- enforceQuota 拋出錯誤

---

### 2.2 管理員限制 (30 個)
[x] [正常情況] 管理員使用量超過 3 個但在 30 個以內
**測試資料**
- isAdmin = true
- used = 10

**預期結果**
- allowed: true
- limit: 30
- remaining: 20

---

## 3. 頻道訂閱限制 (Channel Limit)

### 3.1 訪客限制 (3 個)
[x] [邊界值] 訪客訂閱滿 3 個頻道
**測試資料**
- isGuest = true
- channelCount = 3

**預期結果**
- 拋出 Error: "已達到頻道訂閱上限（3 個）"

[x] [正常情況] 訪客訂閱未滿 3 個時允許
**測試資料**
- isGuest = true
- channelCount = 2

**預期結果**
- 不拋出錯誤
- limit: 3

### 3.2 管理員限制 (20 個)
[x] [正常情況] 管理員訂閱超過 3 個但在 20 個以內
**測試資料**
- isAdmin = true
- channelCount = 10

**預期結果**
- 不拋出錯誤
- limit: 20

---

## 4. 自動更新限制 (Auto Refresh Limit)

### 4.1 訪客限制 (0 個 - 停用)
[x] [異常處理] 訪客嘗試啟用自動更新
**測試資料**
- isGuest = true
- autoRefreshCount = 0

**預期結果**
- 拋出 Error: "訪客模式不支援自動更新頻道"

### 4.2 管理員限制 (5 個)
[x] [正常情況] 管理員啟用自動更新
**測試資料**
- isAdmin = true
- autoRefreshCount = 2

**預期結果**
- 不拋出錯誤
- limit: 5

[x] [邊界值] 管理員啟用自動更新達上限
**測試資料**
- isAdmin = true
- autoRefreshCount = 5

**預期結果**
- 拋出 Error: "已達到自動更新頻道上限（5 個）"
