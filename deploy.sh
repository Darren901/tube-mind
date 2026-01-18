#!/bin/bash

set -e

PROJECT_ID="your-gcp-project-id"
REGION="asia-east1"
IMAGE_NAME="youtube-summarizer"

echo "🔨 Building Docker image..."
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/$IMAGE_NAME:latest .

echo "📤 Pushing to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

echo "🚀 Deploying Web service to Cloud Run..."
gcloud run deploy $IMAGE_NAME-web \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GOOGLE_AI_API_KEY=gemini-api-key:latest,NEXTAUTH_SECRET=nextauth-secret:latest,NEXTAUTH_URL=nextauth-url:latest

echo "🤖 Deploying Worker service to Cloud Run..."
gcloud run deploy $IMAGE_NAME-worker \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 2 \
  --memory 1Gi \
  --cpu 1 \
  --command "npm" \
  --args "run,worker" \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,GOOGLE_AI_API_KEY=gemini-api-key:latest

echo "✅ Deployment complete!"
