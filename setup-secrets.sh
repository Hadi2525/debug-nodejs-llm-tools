#!/bin/bash

# setup-secrets.sh - Automate Cloud Run Secret Manager setup
# Usage: bash setup-secrets.sh
#
# IMPORTANT: Update these variables with your own GCP project values
#

set -e

# ⚠️  UPDATE THESE WITH YOUR OWN VALUES
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
SERVICE_NAME="${SERVICE_NAME:-function-calling-llms}"
REGION="${GCP_REGION:-us-central1}"

echo "🔒 Cloud Run Secret Manager Setup"
echo "=================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
  echo "❌ ERROR: Please update PROJECT_ID in this script or set GCP_PROJECT_ID environment variable"
  echo ""
  echo "Usage:"
  echo "  export GCP_PROJECT_ID=your-actual-project-id"
  echo "  export GCP_REGION=us-central1"
  echo "  bash setup-secrets.sh"
  exit 1
fi

echo ""

# Step 1: Enable Secret Manager API
echo "📍 Step 1: Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Step 2: Get service account
echo ""
echo "📍 Step 2: Getting service account..."
SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format='value(spec.template.spec.serviceAccountName)' \
  --project=$PROJECT_ID)

echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# Step 3: Create secrets (interactively)
echo "📍 Step 3: Creating secrets..."
echo ""

SECRETS=("OPENAI_API_KEY" "GEMINI_API_KEY" "APIFY_TOKEN" "NEWS_API_KEY" "MONGO_URI")

for secret in "${SECRETS[@]}"; do
  echo "---"
  echo "Creating secret: $secret"
  echo "Paste the value and press Ctrl+D when done:"
  
  if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
    echo "⚠️  Secret '$secret' already exists. Skipping..."
  else
    gcloud secrets create $secret \
      --replication-policy="automatic" \
      --project=$PROJECT_ID \
      --data-file=-
    echo "✅ Secret '$secret' created"
  fi
done

echo ""

# Step 4: Grant access to service account
echo "📍 Step 4: Granting service account access to secrets..."
for secret in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding $secret \
    --member=serviceAccount:$SERVICE_ACCOUNT \
    --role=roles/secretmanager.secretAccessor \
    --project=$PROJECT_ID \
    --quiet
  echo "✅ Granted access to $secret"
done

echo ""
echo "✨ All secrets created and configured!"
echo ""
echo "📋 Next steps:"
echo "1. Update your Cloud Run service with:"
echo ""
echo "   gcloud run deploy $SERVICE_NAME \\"
echo "     --image gcr.io/$PROJECT_ID/function-calling-llms:v0.4 \\"
echo "     --region $REGION \\"
echo "     --platform managed \\"
echo "     --set-env-vars \"PORT=3000,BASE_URL=https://<YOUR_SERVICE_URL>\" \\"
echo "     --set-secrets \"OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest,NEWS_API_KEY=NEWS_API_KEY:latest,MONGO_URI=MONGO_URI:latest\" \\"
echo "     --allow-unauthenticated"
echo ""
echo "2. Test your deployment:"
echo "   curl -X POST https://<YOUR_SERVICE_URL>/health"
echo ""
