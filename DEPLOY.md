# TubeMind 部署指南 (GCP + Vercel)

本指南說明如何將 TubeMind 部署至生產環境。
採用 **Vercel (Frontend/API)** + **GCP Compute Engine (Worker/DB/Redis)** 的混合架構，以極大化利用免費額度並確保效能。

## 架構概觀

*   **Frontend & API**: Vercel (Hobby Plan - Free)
*   **Backend Services**: GCP Compute Engine (e2-small / e2-medium)
    *   PostgreSQL 15 (Docker)
    *   Redis 7 (Docker)
    *   TubeMind Worker (Docker, BullMQ)

---

## 1. 環境變數總表 (Configuration Reference)

為了簡化配置，建議在 **GCP Worker** 與 **Vercel** 兩端注入相同的環境變數集合。
唯一不同的是 **資料庫連線字串** (GCP 走 Docker 內網，Vercel 走公網 IP)。

| 變數名稱 (Variable) | GCP Worker (.env) | Vercel (Environment Variables) | 說明 |
| :--- | :--- | :--- | :--- |
| **基礎設施** | | | |
| `POSTGRES_USER` | `postgres` | (不需要) | DB 使用者 |
| `POSTGRES_PASSWORD` | **[自訂強密碼]** | (不需要) | DB 密碼 |
| `POSTGRES_DB` | `tubemind` | (不需要) | DB 名稱 |
| `DATABASE_URL` | `postgresql://postgres:[密碼]@postgres:5432/tubemind?schema=public` | `postgresql://postgres:[密碼]@[GCP_VM_IP]:5432/tubemind?schema=public` | **注意 Host 差異** |
| `REDIS_PASSWORD` | **[自訂強密碼]** | (不需要) | Redis 密碼 |
| `REDIS_URL` | `redis://:[密碼]@redis:6379` | `redis://:[密碼]@[GCP_VM_IP]:6379` | **注意 Host 差異** |
| **AI & Cloud** | | | |
| `GOOGLE_AI_API_KEY` | **[你的 Gemini Key]** | **[你的 Gemini Key]** | AI 生成摘要 |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/app/service-account.json` | (選用) | GCS/TTS 認證 |
| `GCS_BUCKET_NAME` | **[你的 Bucket Name]** | **[你的 Bucket Name]** | 存放音檔 |
| **應用程式** | | | |
| `NEXTAUTH_URL` | `https://[你的專案].vercel.app` | `https://[你的專案].vercel.app` | 生產環境網址 |
| `NEXTAUTH_SECRET` | **[產生亂碼]** | **[產生亂碼]** | Session 加密 |
| `CRON_SECRET` | **[自訂亂碼]** | **[自訂亂碼]** | 保護 Cron API |
| `ADMIN_EMAILS` | `user@gmail.com` | `user@gmail.com` | 管理員白名單 |
| **整合 (OAuth)** | | | |
| `GOOGLE_CLIENT_ID` | **[Google Client ID]** | **[Google Client ID]** | Google 登入 |
| `GOOGLE_CLIENT_SECRET` | **[Google Secret]** | **[Google Secret]** | Google 登入 |
| `NOTION_CLIENT_ID` | **[Notion ID]** | **[Notion ID]** | Notion 同步 |
| `NOTION_CLIENT_SECRET` | **[Notion Secret]** | **[Notion Secret]** | Notion 同步 |
| `NOTION_REDIRECT_URI` | (同 Vercel) | `https://[你的專案].vercel.app/api/auth/callback/notion` | OAuth 回調 |

---

## 階段一：GCP VM 準備

### 1. 建立 VM 實例
1.  進入 GCP Console > Compute Engine。
2.  點擊 "Create Instance"。
3.  **設定**：
    *   **Region**: `asia-east1` (台灣)
    *   **Machine type**: `e2-small` (2 vCPU, 2GB memory) 或 `e2-medium` (4GB)
    *   **Boot disk**: Ubuntu 22.04 LTS, **30GB** Standard persistent disk (預設 10GB 不夠用)。
    *   **Firewall**: 勾選 Allow HTTP/HTTPS traffic。
4.  建立後，至 VPC Network > IP addresses，將該 VM 的 IP 保留為 **Static IP**。

### 2. 設定防火牆 (Firewall Rules)
允許 Vercel 連線至 DB 與 Redis。
1.  至 VPC Network > Firewall。
2.  建立規則 `allow-tubemind-db`：
    *   **Targets**: All instances in the network
    *   **Source filter**: `0.0.0.0/0` (注意：建議設定強密碼，因 Vercel IP 為動態)
    *   **Protocols/ports**: `tcp:5432`, `tcp:6379`

### 3. VM 環境初始化 (SSH 連入 VM)
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Docker & Compose
sudo apt install docker.io docker-compose-plugin -y
sudo usermod -aG docker $USER
# (請重新登入 SSH 以生效群組變更)

# 設定 Swap (防止 2GB RAM OOM)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 階段二：部署後端服務

### 1. 上傳檔案
在你的 **本機開發環境** 執行：
```bash
# 替換 YOUR_VM_IP 為 GCP VM 的外部 IP
export VM_IP="YOUR_VM_IP"

# 建立遠端目錄
ssh $USER@$VM_IP "mkdir -p ~/app"

# 上傳設定檔
scp Dockerfile.worker docker-compose.prod.yml package.json package-lock.json tsconfig.json $USER@$VM_IP:~/app/

# 上傳程式碼
scp -r lib scripts prisma $USER@$VM_IP:~/app/

# 上傳 Service Account Key (TTS/GCS 用)
scp service-account-key.json $USER@$VM_IP:~/app/service-account-key.json
```

### 2. 啟動服務
SSH 連入 VM：
```bash
cd ~/app

# 建立 .env 檔案
nano .env
```

**請參考上方的「環境變數總表」填入內容**。GCP Worker 的 `.env` 範例如下：

```env
# Infrastructure
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
POSTGRES_DB=tubemind
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/tubemind?schema=public
REDIS_PASSWORD=...
REDIS_URL=redis://:YOUR_PASSWORD@redis:6379

# AI & Cloud
GOOGLE_AI_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
GCS_BUCKET_NAME=...

# App Config
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=...
CRON_SECRET=...
ADMIN_EMAILS=...

# Integration (Worker 雖不強制需要，但建議填入以保持一致)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=...
```

**啟動 Docker Compose**：
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**檢查狀態**：
```bash
docker compose -f docker-compose.prod.yml logs -f worker
```
確認 Worker 成功連線 DB 與 Redis，並顯示 `Worker started`。

---

## 階段三：部署 Frontend (Vercel)

### 1. 匯入專案
1.  將程式碼推送到 GitHub。
2.  在 Vercel Dashboard 點擊 "Add New..." > "Project"。
3.  選擇 TubeMind Repository。

### 2. 設定環境變數 (Environment Variables)
在 Vercel 部署設定頁面 (Project Settings > Environment Variables)，**請參考上方的「環境變數總表」** 填入所有變數。

重點提醒：
*   **DATABASE_URL**: 必須使用 GCP VM 的 **外部 IP (External IP)**。
*   **REDIS_URL**: 必須使用 GCP VM 的 **外部 IP**。
*   **GOOGLE_APPLICATION_CREDENTIALS**: Web 端通常不需要此變數（除非你在 API Route 中直接使用了 GCS/TTS SDK 而非透過 Worker）。

### 3. 部署
點擊 **Deploy**。等待 Vercel 建置完成。

---

## 驗證部署

1.  訪問 Vercel 網址，測試 Google 登入。
2.  貼上一個 YouTube 連結，點擊「建立摘要」。
3.  觀察 GCP VM 上的 Worker logs (`docker compose logs -f worker`)，確認收到任務並開始跑 AI/TTS。
4.  確認前端收到 SSE 通知並更新狀態。

恭喜！你的 TubeMind 已成功上雲！🚀
