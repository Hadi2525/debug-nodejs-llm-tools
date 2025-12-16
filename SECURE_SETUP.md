# 🔒 Secure Setup with Google Cloud Secret Manager

This guide shows how to securely manage API keys using Google Cloud Secret Manager instead of environment variables.

## Why Secret Manager?

- ✅ Keys are encrypted at rest and in transit
- ✅ Keys are never logged or exposed in deployment configs
- ✅ Fine-grained access control (IAM)
- ✅ Audit trails of all key access
- ✅ Easy key rotation without redeployment

## Step 1: Create Secrets in Secret Manager

Replace the values with your **NEW** API keys (rotate the old exposed ones):

```bash
# Set your project ID
PROJECT_ID="your-gcp-project-id"

# Create each secret
gcloud secrets create OPENAI_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID <<< "YOUR_NEW_OPENAI_KEY"

gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID <<< "YOUR_NEW_GEMINI_KEY"

gcloud secrets create APIFY_TOKEN \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID <<< "YOUR_APIFY_TOKEN"

gcloud secrets create NEWS_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID <<< "YOUR_NEWS_API_KEY"

gcloud secrets create MONGO_URI \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID <<< "YOUR_MONGO_URI"
```

Or interactively (more secure):

```bash
PROJECT_ID="your-gcp-project-id"

gcloud secrets create OPENAI_API_KEY \
  --replication-policy="automatic" \
  --project=$PROJECT_ID
# Then paste your key when prompted
```

## Step 2: Verify Secrets Created

```bash
# Replace with your project ID
PROJECT_ID="your-gcp-project-id"

gcloud secrets list --project=$PROJECT_ID
```

Output should show:
```
NAME               CREATED              REPLICATION_POLICY
OPENAI_API_KEY     2025-12-16T...       automatic
GEMINI_API_KEY     2025-12-16T...       automatic
APIFY_TOKEN        2025-12-16T...       automatic
NEWS_API_KEY       2025-12-16T...       automatic
MONGO_URI          2025-12-16T...       automatic
```

## Step 3: Grant Cloud Run Access to Secrets

Get your Cloud Run service account email:

```bash
# Replace with your service name and region
gcloud run services describe function-calling-llms \
  --region us-central1 \
  --format='value(spec.template.spec.serviceAccountName)'
```

This will output something like: `function-calling-llms@PROJECT_ID.iam.gserviceaccount.com`

Then grant it access to read all secrets:

```bash
# Replace with your project ID and service account
SERVICE_ACCOUNT="function-calling-llms@YOUR_PROJECT_ID.iam.gserviceaccount.com"

for secret in OPENAI_API_KEY GEMINI_API_KEY APIFY_TOKEN NEWS_API_KEY MONGO_URI; do
  gcloud secrets add-iam-policy-binding $secret \
    --member=serviceAccount:$SERVICE_ACCOUNT \
    --role=roles/secretmanager.secretAccessor
done
```

## Step 4: Deploy with Secret References

Deploy your Cloud Run service with secret references:

```bash
# Set your values
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
SERVICE_NAME="function-calling-llms"
IMAGE_TAG="v0.8"

gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,APIFY_TOKEN=APIFY_TOKEN:latest,NEWS_API_KEY=NEWS_API_KEY:latest,MONGO_URI=MONGO_URI:latest" \
  --allow-unauthenticated
```

Note: Do NOT use `--set-env-vars` with hardcoded URLs. Use `BASE_URL` from environment configuration only.

## Step 5: Verify Deployment

```bash
# Check the service was updated
gcloud run services describe function-calling-llms --region us-central1

# View environment variables (notice secrets are NOT shown here - they're secure)
gcloud run services describe function-calling-llms \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'

# Get your service URL and test it
SERVICE_URL=$(gcloud run services describe function-calling-llms --region us-central1 --format='value(status.url)')
curl -X POST $SERVICE_URL/health
```

## Step 6: Update Your Local .env

Keep your local `.env` for local development (already in .gitignore):

```env
OPENAI_API_KEY=your_local_key_for_testing
GEMINI_API_KEY=your_local_key_for_testing
APIFY_TOKEN=your_local_token
NEWS_API_KEY=your_local_key
MONGO_URI=your_mongo_uri
PORT=3000
BASE_URL=http://localhost:3000
```

## Step 7: Rotate Keys (When Needed)

To rotate a key without redeploying:

```bash
# Set your project ID
PROJECT_ID="your-gcp-project-id"

# Create a new version
echo "YOUR_NEW_KEY" | gcloud secrets versions add GEMINI_API_KEY \
  --data-file=- \
  --project=$PROJECT_ID

# Cloud Run automatically uses the latest version
```

## Troubleshooting

**Issue: Permission denied when accessing secrets**
```bash
# Verify service account has access
PROJECT_ID="your-gcp-project-id"
gcloud secrets get-iam-policy GEMINI_API_KEY --project=$PROJECT_ID
```

**Issue: Secret not found**
```bash
# Make sure you created the secret
PROJECT_ID="your-gcp-project-id"
gcloud secrets describe GEMINI_API_KEY --project=$PROJECT_ID
```

**Issue: Cloud Run logs show "secret not available"**
```bash
# Check deployment logs (replace with your region and project)
SERVICE_NAME="function-calling-llms"
REGION="us-central1"
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 50
```

## Local Development (Without Secrets)

For local testing, just use regular environment variables in `.env`:

```bash
# Start your local server
node server.js

# Run tests
node tests/test-openai-news.js
```

The code automatically falls back to environment variables if `CLOUD_RUN_SECRET_VERSION` is not set.

---

**Next steps:**
1. Rotate all exposed keys in Google Cloud Console
2. Run the commands above to create secrets
3. Deploy your updated service
4. Test with Cloud Run logs to verify it works

