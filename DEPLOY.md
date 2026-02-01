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

# 建立 .env 檔案 (填入生產環境密碼)
nano .env
```

**.env 內容範例**：
```env
POSTGRES_PASSWORD=由你設定的高強度密碼
REDIS_PASSWORD=由你設定的高強度密碼

# AI Keys
GOOGLE_GENERATIVE_AI_API_KEY=你的_GEMINI_KEY
GCS_BUCKET_NAME=你的_BUCKET_NAME

# Notion (Optional)
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...

# App Config
NEXTAUTH_URL=https://你的-vercel-app.vercel.app
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
在 Vercel 部署設定頁面，填入以下變數：

| Variable | Value | 說明 |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:你的DB密碼@GCP_VM_IP:5432/tubemind` | 指向 GCP |
| `REDIS_URL` | `redis://:你的Redis密碼@GCP_VM_IP:6379` | 指向 GCP |
| `NEXTAUTH_URL` | `https://你的專案名.vercel.app` | Vercel 網域 |
| `NEXTAUTH_SECRET` | (產生一組亂碼 `openssl rand -base64 32`) | 加密用 |
| `GOOGLE_CLIENT_ID` | (從 Google Cloud Console 取得) | OAuth |
| `GOOGLE_CLIENT_SECRET` | (從 Google Cloud Console 取得) | OAuth |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (你的 Gemini Key) | AI |
| `GOOGLE_APPLICATION_CREDENTIALS` | (不需要) | Web 端通常不直接用這個，除非 API Route 有用到 GCS |

*注意：如果 API Route (`app/api/...`) 也有用到 GCS/TTS，則 Vercel 也需要 Service Account。建議將 JSON 內容壓縮為 base64 字串存入環境變數，並在程式碼中解碼使用。但目前架構主要由 Worker 處理 GCS/TTS，Web 端可能只讀取公開 URL，故可能不需要。*

### 3. 部署
點擊 **Deploy**。等待 Vercel 建置完成。

---

## 驗證部署

1.  訪問 Vercel 網址，測試 Google 登入。
2.  貼上一個 YouTube 連結，點擊「建立摘要」。
3.  觀察 GCP VM 上的 Worker logs (`docker compose logs -f worker`)，確認收到任務並開始跑 AI/TTS。
4.  確認前端收到 SSE 通知並更新狀態。

恭喜！你的 TubeMind 已成功上雲！🚀
