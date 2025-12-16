# 🚀 Quick Start: Secure Secrets Setup

## IMPORTANT: Your API Keys Are Exposed! 🚨

Your keys were shared publicly. **Immediately rotate them:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Disable/delete the exposed API keys
3. Create NEW ones
4. Use the new ones in the following setup

---

## Option 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
bash setup-secrets.sh
```

This will:
- ✅ Enable Secret Manager API
- ✅ Prompt you to enter each new API key securely
- ✅ Create secrets in Google Cloud Secret Manager
- ✅ Grant your Cloud Run service permission to access them

Then deploy (see Step 4 below for complete command with your own URLs):

```bash
gcloud run deploy function-calling-llms \
  --image gcr.io/YOUR_PROJECT/function-calling-llms:latest \
  --region YOUR_REGION \
  --platform managed \
  --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,..." \
  --allow-unauthenticated
```

---

## Option 2: Manual Setup

If you prefer to set up manually, see [SECURE_SETUP.md](SECURE_SETUP.md) for detailed steps.

---

## Step 1: Rotate Your API Keys ⚠️

**OpenAI API Key:**
1. Go to [OpenAI API Keys](https://platform.openai.com/account/api-keys)
2. Delete the exposed key
3. Create a new one
4. Copy the new key

**Google Gemini API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services → Credentials
3. Delete the exposed Gemini API key
4. Create a new one
5. Copy the new key

**Other Keys:**
- Rotate NEWS_API_KEY at [NewsAPI.org](https://newsapi.org/account)
- Rotate APIFY_TOKEN at [Apify Console](https://console.apify.com)

---

## Step 2: Update Your Local .env (for local testing only)

```bash
# Edit .env with your NEW keys
nano .env
```

Update with new values:
```env
OPENAI_API_KEY=sk-...YOUR_NEW_OPENAI_KEY...
GEMINI_API_KEY=AIzaSy...YOUR_NEW_GEMINI_KEY...
APIFY_TOKEN=apify_...YOUR_NEW_APIFY_TOKEN...
NEWS_API_KEY=YOUR_NEW_NEWS_API_KEY
MONGO_URI=mongodb+srv://USER:PASS@HOST/...
PORT=3000
BASE_URL=http://localhost:3000
```

---

## Step 3: Create Cloud Secrets

Run the automated setup:

```bash
bash setup-secrets.sh
```

When prompted, paste each NEW API key one at a time.

---

## Step 4: Deploy to Cloud Run

After secrets are created, replace the placeholders and run:

```bash
# Set your values
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"  # or your preferred region
SERVICE_NAME="function-calling-llms"
IMAGE_TAG="v0.8"

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest,NEWS_API_KEY=NEWS_API_KEY:latest,MONGO_URI=MONGO_URI:latest" \
  --allow-unauthenticated
```

After deployment, Cloud Run will output your service URL. Update `BASE_URL` in your .env locally.

---

## Step 5: Test Your Deployment

After deployment, you'll get a service URL like `https://SERVICE-HASH-REGION.run.app`

```bash
# Set your deployed service URL
SERVICE_URL="https://your-service-hash-region.run.app"

# Test the health endpoint
curl -X POST $SERVICE_URL/health

# Run a test script
node tests/test-gemini-news.js

# View logs
gcloud run services logs read function-calling-llms --limit 50
```

---

## Why This Is Better

| Aspect | Environment Variables | Secret Manager |
|--------|----------------------|-----------------|
| **Security** | ❌ Visible in configs | ✅ Encrypted |
| **Exposure Risk** | ❌ High (in logs, configs) | ✅ Low (never logged) |
| **Key Rotation** | ❌ Requires redeployment | ✅ Instant |
| **Audit Trail** | ❌ No tracking | ✅ Full audit log |
| **Access Control** | ❌ All or nothing | ✅ Fine-grained IAM |

---

## Troubleshooting

**Q: My test still fails with "API key not valid"**
- Make sure you rotated to a NEW key (old one is invalid)
- Verify the secret was created: `gcloud secrets list`
- Check service account has access: `gcloud secrets get-iam-policy GEMINI_API_KEY`
- View logs: `gcloud run services logs read function-calling-llms --limit 20`

**Q: Secret Manager API not enabled**
```bash
gcloud services enable secretmanager.googleapis.com
```

**Q: Permission denied when accessing secrets**
```bash
# Re-run setup-secrets.sh to grant permissions again
bash setup-secrets.sh
```

**Q: How do I find my Cloud Run service URL?**
```bash
gcloud run services describe function-calling-llms --region YOUR_REGION --format='value(status.url)'
```

---

## Local Testing (Development)

Your `.env` file is in `.gitignore`, so it won't be committed. For local development:

```bash
# Start server locally
node server.js

# Run tests against localhost
export BASE_URL=http://localhost:3000
node tests/test-gemini-news.js
```

---

See [SECURE_SETUP.md](SECURE_SETUP.md) for more detailed information.
