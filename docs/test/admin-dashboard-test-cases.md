# Admin Dashboard 測試案例

**測試目標**: `app/(admin)` 下的 Layout 與頁面
**相關功能**: 管理員權限檢查、儀表板數據統計、使用者列表
**測試框架**: Vitest + TypeScript
**測試狀態**: ✅ 5/5 測試通過

---

## 1. 權限檢查 (Access Control)

### 1.1 路由保護
[x] [異常處理] 未登入使用者訪問 `/admin` 應被導向登入頁
**測試資料**
- session = null

**預期結果**
- redirect 到 `/auth/signin`

[x] [異常處理] 非管理員使用者訪問 `/admin` 應被導向首頁
**測試資料**
- session.user.email = "guest@example.com"
- ADMIN_EMAILS = "admin@example.com"

**預期結果**
- redirect 到 `/channels`

[x] [正常情況] 管理員使用者可以訪問 `/admin`
**測試資料**
- session.user.email = "admin@example.com"
- ADMIN_EMAILS = "admin@example.com"

**預期結果**
- 渲染 Admin Layout
- 不發生 redirect

---

## 2. 儀表板數據 (Dashboard Stats)

### 2.1 統計數據獲取
[x] [正常情況] 正確顯示系統統計數據
**測試資料**
- users count = 10
- summaries count = 50
- channels count = 5
- summaries today = 5
- pending jobs = 2

**預期結果**
- `prisma.count` 被正確呼叫
- 頁面渲染正確的數值

---

## 3. 使用者列表 (User List)

### 3.1 列表與額度計算
[x] [正常情況] 顯示使用者列表與今日額度
**測試資料**
- User A: Admin, used 10 summaries today
- User B: Guest, used 2 summaries today
- Mock Prisma responses

**預期結果**
- 正確計算 User A 的額度為 10/30 (Admin limit)
- 正確計算 User B 的額度為 2/3 (Guest limit)
- 正確標示 Admin/Guest 標籤
