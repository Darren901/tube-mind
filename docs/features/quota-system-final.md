# 多層級動態額度與限流系統 (Multi-Level Quota System)

## 系統概述

為了在雲端部署環境中有效控制成本（Gemini API、YouTube API）並防止惡意濫用，TubeMind 實作了一套 **基於角色 (Role-Based)** 的動態配額系統，搭配 **系統層級 (System-Level)** 的防護機制。

這套系統確保了：
1.  **成本可控**: 嚴格限制 API 消耗，防止費用失控。
2.  **資源公平**: 防止單一使用者耗盡 Worker 隊列資源。
3.  **體驗分級**: 讓訪客 (Guest) 能體驗核心功能，同時保留完整權限給管理員 (Admin)。

---

## 1. 角色權限分級 (Role-Based Quotas)

系統根據使用者 Email 是否存在於白名單 (`ADMIN_EMAILS`) 中，動態賦予不同的配額限制。

| 限制項目 | 訪客 (Guest) | 管理員 (Admin) | 設計目的 |
| :--- | :--- | :--- | :--- |
| **每日摘要上限** | **3** 個 / 24h | **30** 個 / 24h | 控制 Gemini API 成本。訪客僅需體驗，管理員需日常使用。 |
| **頻道訂閱上限** | **3** 個 | **20** 個 | 防止資料庫膨脹與過多的背景同步檢查。 |
| **自動更新額度** | **0** 個 (停用) | **5** 個 | Auto-Refresh 是成本大戶，僅開放信任的管理者使用。 |

*註：每日摘要上限採 **滾動式視窗 (Rolling Window)** 計算，統計過去 24 小時內的生成數量。*

---

## 2. 系統層級防護 (System-Level Protection)

除了針對使用者的配額，系統還實作了全域的安全閥，保護後端基礎設施。

### 佇列過載保護 (Queue Protection)
*   **限制**: 每位使用者最多同時擁有 **25 個** 待處理任務 (`pending`, `active`, `delayed`)。
*   **目的**: 防止惡意使用者短時間內送出大量請求，塞爆 Redis 隊列，導致其他使用者的任務被阻塞。
*   **實作**: `lib/queue/summaryQueue.ts` 在 `add` 之前檢查 `getPendingJobsCount`。

### 影片長度限制 (Duration Limit)
*   **限制**: 僅處理長度在 **5 小時** 以內的影片。
*   **目的**:
    *   避免超長影片導致轉錄 (Transcript) 失敗或超時。
    *   防止單一任務佔用過多 GPU/TPU 運算時間。
    *   控制 Token 數量（長影片通常 Token 數極高）。
*   **實作**: `app/api/summaries/route.ts` 與 `lib/constants/limits.ts`。

---

## 3. 實作架構

### 核心檔案
1.  **設定檔**: `lib/constants/limits.ts` - 集中管理所有常數 (Guest/Admin Limits, System Limits)。
2.  **邏輯層**: `lib/quota/dailyLimit.ts` - 包含 `checkDailyQuota`, `enforceQuota`, `getUserLimits` 等核心邏輯。
3.  **API 層**: `app/api/quota/route.ts` - 提供前端查詢當前額度狀態。

### 檢查流程
當使用者請求生成摘要時：
1.  **API Route**: 檢查影片長度是否 < 5 小時。
2.  **Queue Pre-check**: 呼叫 `enforceQuota(userId)`。
    *   判斷 User Role (Guest/Admin)。
    *   查詢 DB 統計過去 24h 摘要數。
    *   若超過，拋出 429 錯誤。
3.  **Queue Capacity**: 檢查 Redis 中該使用者的 pending jobs 數量。
    *   若 > 25，拋出 429 錯誤。
4.  **Job Enqueue**: 通過所有檢查後，任務才被加入隊列。

### Cron Job 整合
在 `app/api/cron/check-new-videos` 中：
*   採用 **Fail-Safe** 設計：若某使用者的自動更新觸發額度限制，系統會記錄並跳過該使用者的後續頻道，但不影響其他使用者。

---

## 4. 前端整合與 UX

### QuotaCard 組件
位於 `components/QuotaCard.tsx`，提供即時視覺化回饋：
*   **進度條**: 綠色 (充裕) -> 黃色 (低於 5) -> 紅色 (耗盡)。
*   **倒數計時**: 顯示「約 X 小時後重置」，每分鐘自動更新。
*   **訪客提示**: 若為訪客，顯示「訪客模式」標籤，提示權限受限。

### 錯誤訊息
系統提供友善的錯誤提示，而非冷冰冰的代碼：
*   *"已達到每日摘要生成上限（3 個/24 小時）。將在約 5 小時後重置。"*
*   *"已達到待處理任務上限（25 個）。請等待現有任務完成後再試。"*

---

## 5. 測試覆蓋 (Test Coverage)

本系統經過嚴格的自動化測試驗證，確保權限邏輯無誤。

*   **測試檔案**: `test/lib/quota/dailyLimit.test.ts`, `test/lib/quota/guestLimit.test.ts`
*   **覆蓋場景**:
    *   ✅ 訪客額度限制 (3個) 觸發攔截。
    *   ✅ 管理員額度限制 (30個) 正常通過。
    *   ✅ 頻道訂閱上限攔截。
    *   ✅ Auto-Refresh 權限攔截。
    *   ✅ 滾動視窗時間計算準確性。
    *   ✅ 佇列上限保護機制。

**目前狀態**: 相關測試案例全數通過 (Pass)。

---

## 6. 未來擴展

*   **Redis 快取**: 目前額度計算需查詢 DB (`count` 操作)，未來可引入 Redis Rolling Window 演算法降低 DB 負載。
*   **付費訂閱**: 架構已支援多層級 Role，可輕易擴充 `Premium` 角色與對應額度。
