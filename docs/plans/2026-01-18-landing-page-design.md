# TubeMind Landing Page 設計文檔

**日期：** 2026-01-18  
**目標：** 創建黑底科技風格的產品形象首頁  
**參考：** BridgeMind.ai 風格

---

## 設計目標

- **主要目的：** 產品功能介紹
- **目標用戶：** 未登入的新訪客（已登入用戶自動跳轉 dashboard）
- **敘事結構：** 問題 → 解決方案 → 使用流程

---

## 配色系統

### 主色調
- **背景黑：** `#0a0a0a`（主背景）
- **次要背景：** `#1a1a1a`（卡片/區塊）

### 強調色
- **亮紅色：** `#FF3B3B`（CTA 按鈕、重點文字）
- **Tiffany 綠：** `#0ABAB5`（次要元素、圖標、裝飾）
- **漸層紅：** `#FF3B3B` → `#FF6B6B`（按鈕懸停）

### 中性色
- **主文字：** `#E5E5E5`（高可讀性白）
- **次要文字：** `#A0A0A0`（描述文字）
- **邊框/分隔線：** `#2a2a2a`

---

## 字體系統

- **大標題（Hero）：** Bebas Neue（粗體、全大寫、tracking 加寬）
- **區塊標題：** Rajdhani Bold（清晰、科技感）
- **內文：** IBM Plex Sans（可讀性高、專業）
- **代碼/數據：** JetBrains Mono（等寬、少量使用）

---

## 技術棧

- **框架：** Next.js 14 (App Router)
- **動畫庫：** Framer Motion（滾動視差、元素動畫）
- **樣式：** Tailwind CSS + CSS Variables
- **圖標：** Lucide React（現代化、一致性高）

---

## 頁面結構

```
/ (app/page.tsx) - 未登入首頁
├── Hero Section
├── Problem Section (痛點)
├── Solution Section (解決方案)
├── Features Section (3 大功能詳細)
├── How It Works (使用流程)
├── Stats Section (數據展示)
└── CTA Footer
```

---

## Section 1: Hero Section

### 設計要點
- 全屏高度（100vh）
- 內容垂直居中，左對齊
- 背景：黑色 + 網格動畫 + 漸層光暈

### 內容元素
1. **主標題：** "TUBEMIND 你的 YouTube 知識庫"
   - Bebas Neue，80-120px
   - 紅色漸層 + 發光效果

2. **副標題：** "AI 自動摘要，讓每個影片都成為你的知識資產"
   - Rajdhani Medium，32-40px
   - Tiffany 綠色

3. **描述：** "追蹤你喜愛的頻道，自動生成繁中摘要，再也不用花時間看完整影片"
   - IBM Plex Sans，18px
   - 淺灰色

4. **CTA 按鈕組：**
   - 主：「開始使用」（紅色漸層）
   - 次：「了解更多」（Tiffany 綠邊框）

### 動畫效果
- 主標題：左滑入 + 淡入（delay 0ms）
- 副標題：左滑入 + 淡入（delay 200ms）
- 描述：淡入（delay 400ms）
- 按鈕：下滑入（delay 600ms）
- 背景網格：漸顯（1s）

---

## Section 2: Problem Section

### 布局
- 左右兩欄（桌面）/ 上下堆疊（手機）
- 上下 padding：120px

### 內容元素

**左側：視覺呈現**
- YouTube 訂閱爆滿的視覺化
- 使用 Tiffany 綠和紅色點綴

**右側：文字內容**
1. 小標題："THE PROBLEM"（Tiffany 綠，JetBrains Mono）
2. 主標題："訂閱了 50 個頻道，卻沒時間看完任何一個？"
   - "50 個頻道"用紅色強調
3. 痛點列表：
   - ❌ 每天數十個新影片通知，根本看不完
   - ❌ 想快速了解內容，卻要看完整 20 分鐘影片
   - ❌ 精彩內容散落各處，無法系統化整理

### 視差效果
- 左側圖片：0.5x 速度
- 右側文字：1x 速度

---

## Section 3: Solution Section

### 布局
- 背景：#1a1a1a
- 內容居中對齊

### 內容元素

**標題區（居中）：**
- 小標題："THE SOLUTION"（紅色）
- 主標題："TubeMind 讓 AI 幫你看影片"
- 副標題："自動追蹤、智能摘要、知識留存"

**三大特色卡片（並排）：**

1. **追蹤頻道**
   - 圖標：`<Rss />` - Tiffany 綠
   - 描述：連結 YouTube 帳號，一鍵匯入訂閱頻道
   - 懸停：綠色邊框 + 上浮

2. **智能摘要（中間，放大）**
   - 圖標：`<Sparkles />` - 紅色漸層
   - 描述：Gemini AI 生成繁中摘要，5 分鐘掌握 1 小時內容
   - 懸停：紅色邊框 + 脈衝動畫

3. **知識留存**
   - 圖標：`<Database />` - Tiffany 綠
   - 描述：集中管理，隨時搜尋，打造專屬知識庫
   - 懸停：綠色邊框 + 上浮

---

## Section 4: Features Section

### 布局
- 三個功能區塊，交替左右布局
- 區塊間距：80px

### 功能詳細說明

**功能 1：一鍵匯入訂閱頻道（左文右圖）**
- 圖標：`<Youtube />` - 紅色
- 標題："連結 YouTube，秒速開始"
- 特點：OAuth 安全登入 / 自動同步訂閱 / 隱私加密
- 右側：頻道列表 UI 截圖 + 3D 傾斜效果

**功能 2：AI 智能摘要（右文左圖）**
- 圖標：`<Brain />` - 紅色
- 標題："Gemini AI 深度理解"
- 特點：多語言支援 / 智能段落分類 / 關鍵時間戳
- 左側：摘要頁面 UI + 打字機動畫

**功能 3：知識庫管理（左文右圖）**
- 圖標：`<Search />` - Tiffany 綠
- 標題："隨時搜尋，快速回顧"
- 特點：全文搜尋 / 標籤分類 / 收藏管理
- 右側：搜尋介面 UI + 高亮效果

### 視差效果
- 圖片：0.7x 速度
- 文字：1x 速度

---

## Section 5: How It Works

### 布局
- 水平時間軸（桌面）/ 垂直堆疊（手機）
- 背景：深色漸層

### 流程步驟

**步驟 1：連結帳號**
- 編號徽章："01"（紅色漸層圓形）
- 圖標：`<LogIn />` - Tiffany 綠
- 標題："連結 YouTube 帳號"
- 描述：Google 一鍵登入，自動匯入訂閱

**步驟 2：選擇頻道**
- 編號徽章："02"
- 圖標：`<ListChecks />` - 紅色
- 標題："選擇想追蹤的頻道"
- 描述：點擊更新，AI 自動生成摘要

**步驟 3：享受摘要**
- 編號徽章："03"
- 圖標：`<CheckCircle />` - Tiffany 綠
- 標題："輕鬆閱讀摘要"
- 描述：完成通知，隨時查看管理

**連接線：**
- Tiffany 綠虛線 + 流動動畫

**底部 CTA：**
- "立即開始使用 TubeMind"（紅色漸層大按鈕）

---

## Section 6: Stats Section

### 數據指標（四個並排）

1. **1,000+** 影片已摘要（紅色漸層）
2. **50+** 支援頻道（Tiffany 綠）
3. **10,000+** 節省時數（紅色漸層）
4. **99%** 準確率（Tiffany 綠）

### 動畫
- 計數動畫（CountUp 從 0 到目標值）
- 滾動觸發

---

## Section 7: CTA Footer

### 主要內容（居中）
- 小標題："READY TO START?"（Tiffany 綠）
- 大標題："讓 AI 成為你的學習助手"
- 描述："立即開始，讓每個 YouTube 影片都變成你的知識資產"

### 按鈕組
- 主："免費開始使用"（紅色漸層 + 箭頭圖標）
- 次："查看功能"（Tiffany 綠邊框）

### Footer 底部
- 左：© 2026 TubeMind. All rights reserved.
- 中：隱私政策 | 服務條款 | 聯絡我們
- 右：社群圖標（GitHub, Twitter）

---

## 動畫規範

### 動畫強度：中等明顯型
- 滑入距離：50-80px
- 視差速度差：0.3x - 0.7x
- 懸停效果：輕微上浮（-10px）、scale（1.05）
- 過渡時間：0.3s - 0.6s

### 滾動視差層次
- 背景元素：0.3x - 0.5x
- 圖片：0.7x
- 文字內容：1x

### 進場動畫觸發
- 使用 Framer Motion 的 `useInView` hook
- 觸發點：元素進入視窗 20%

---

## 響應式設計

### 斷點
- Mobile：< 768px
- Tablet：768px - 1024px
- Desktop：> 1024px

### 調整重點
- 字體縮放：Desktop 100% → Mobile 70%
- 布局：左右並排 → 上下堆疊
- Padding：Desktop 120px → Mobile 60px
- Hero 高度：Desktop 100vh → Mobile 80vh

---

## 路由邏輯

```typescript
// app/page.tsx
export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  // 已登入 → 重導向 dashboard
  if (session?.user) {
    redirect('/(dashboard)')
  }
  
  // 未登入 → 顯示 Landing Page
  return <LandingPage />
}
```

---

## 實作檔案結構

```
app/
├── page.tsx (路由邏輯 + Landing Page 主體)
├── globals.css (CSS Variables + 基礎樣式)
└── components/
    └── landing/
        ├── Hero.tsx
        ├── Problem.tsx
        ├── Solution.tsx
        ├── Features.tsx
        ├── HowItWorks.tsx
        ├── Stats.tsx
        └── CTAFooter.tsx
```

---

## 後續優化（Phase 2）

- [ ] 實際 UI 截圖替換線框圖
- [ ] 真實數據替換模擬數據
- [ ] SEO 優化（meta tags, structured data）
- [ ] 載入動畫優化（骨架屏）
- [ ] A/B 測試不同 CTA 文案
- [ ] 加入使用者評價區塊

---

## 參考資源

- [BridgeMind.ai](https://www.bridgemind.ai/) - 整體風格參考
- [Framer Motion](https://www.framer.com/motion/) - 動畫實作
- [Lucide Icons](https://lucide.dev/) - 圖標庫
- Google Fonts：Bebas Neue, Rajdhani, IBM Plex Sans
