// 系統限制常數

// 基礎限制（所有使用者適用）
export const BASE_LIMITS = {
  MAX_PENDING_JOBS_PER_USER: 25,       // 最多 25 個待處理任務
  MAX_VIDEO_DURATION_SECONDS: 5 * 60 * 60,  // 5 小時
  VIDEOS_PER_CHANNEL_REFRESH: 5,       // 每次頻道更新抓取 5 個影片
} as const

// 訪客限制（預設）
export const GUEST_LIMITS = {
  MAX_CHANNELS_PER_USER: 3,            // 訪客最多訂閱 3 個頻道
  MAX_AUTO_REFRESH_CHANNELS: 0,        // 訪客不可使用 autoRefresh
  DAILY_SUMMARY_LIMIT: 3,              // 訪客每日最多 3 個摘要
} as const

// 管理員限制（白名單使用者）
export const ADMIN_LIMITS = {
  MAX_CHANNELS_PER_USER: 20,           // 管理員最多訂閱 20 個頻道
  MAX_AUTO_REFRESH_CHANNELS: 5,        // 管理員可設定 5 個自動更新
  DAILY_SUMMARY_LIMIT: 30,             // 管理員每日 30 個摘要
} as const

// 為了相容現有程式碼，預設導出 ADMIN_LIMITS，但會標記為 Deprecated
// 實際邏輯應使用 getUserLimits(email) 取得動態限制
export const LIMITS = {
  ...BASE_LIMITS,
  ...ADMIN_LIMITS,
} as const
