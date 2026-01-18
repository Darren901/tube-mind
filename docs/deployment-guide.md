# 部署指南

## 前置準備

### 1. 建立 Neon PostgreSQL 資料庫

1. 前往 https://neon.tech
2. 註冊並建立新專案
3. 複製連線字串

### 2. 建立 Upstash Redis

1. 前往 https://upstash.com
2. 建立 Global Redis 資料庫
3. 複製 TLS 連線字串

### 3. 設定 Google OAuth

1. 前往 https://console.cloud.google.com
2. 建立 OAuth 2.0 憑證
3. 設定授權重新導向 URI：`https://your-domain.run.app/api/auth/callback/google`
4. 複製 Client ID 和 Client Secret

### 4. 取得 Gemini API Key

1. 前往 https://ai.google.dev
2. 建立 API Key

## GCP 部署步驟

### 1. 設定 GCP Secrets

\`\`\`bash
# Database URL
echo -n "postgresql://user:pass@xxx.neon.tech/db?sslmode=require" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
echo -n "rediss://default:xxx@xxx.upstash.io:6379" | \
  gcloud secrets create redis-url --data-file=-

# Google OAuth
echo -n "your-client-id" | \
  gcloud secrets create google-client-id --data-file=-
echo -n "your-client-secret" | \
  gcloud secrets create google-client-secret --data-file=-

# Gemini API Key
echo -n "your-gemini-key" | \
  gcloud secrets create gemini-api-key --data-file=-

# NextAuth Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create nextauth-secret --data-file=-

# NextAuth URL
echo -n "https://your-app.run.app" | \
  gcloud secrets create nextauth-url --data-file=-

# Cron Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create cron-secret --data-file=-
\`\`\`

### 2. 執行資料庫 Migration

\`\`\`bash
# 本機執行
DATABASE_URL="your-neon-url" npx prisma migrate deploy
\`\`\`

### 3. 部署應用

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

### 4. 設定 Cloud Scheduler

\`\`\`bash
gcloud scheduler jobs create http check-new-videos \
  --schedule="0 8 * * *" \
  --uri="https://your-app.run.app/api/cron/check-new-videos" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --location=asia-east1
\`\`\`

## 驗證部署

1. 前往 Cloud Run 頁面確認服務運行
2. 開啟網站測試登入功能
3. 新增一個頻道測試功能
4. 檢查 Worker logs 確認摘要生成

## 監控

\`\`\`bash
# 查看 Web logs
gcloud run logs read youtube-summarizer-web --region asia-east1

# 查看 Worker logs
gcloud run logs read youtube-summarizer-worker --region asia-east1
\`\`\`
