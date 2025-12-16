# Test Scripts for debug-nodejs-llm-tools

This directory contains Node.js test scripts that call the LLM function-calling endpoints. Each script demonstrates a different use case and can be run individually.

## Setup

Before running any tests, ensure:
1. The server is running: `node server.js` (from the project root)
2. You have a `.env` file with required API keys (see main README.md)
3. You have installed dependencies: `npm install`

## Environment Variables

The scripts use the following environment variables:
- `BASE_URL` - Override the base URL (defaults to `http://localhost:PORT`)
- `PORT` - Server port (defaults to 3000)
- `CLOUD_RUN_URL` - Optional Cloud Run service URL for comparison testing

To use a custom base URL, set it in your `.env`:
```
BASE_URL=http://your-custom-url:3000
PORT=3000
CLOUD_RUN_URL=https://your-cloud-run-service.a.run.app
```

## Available Test Scripts

### OpenAI Endpoint Tests (`/query`)

1. **test-openai-news.js** - Query about latest OpenAI updates
   ```bash
   node tests/test-openai-news.js
   ```

2. **test-openai-temperature.js** - Convert temperature (F to C)
   ```bash
   node tests/test-openai-temperature.js
   ```

3. **test-openai-distance.js** - Convert distance (km to miles)
   ```bash
   node tests/test-openai-distance.js
   ```

4. **test-openai-places.js** - Find sushi restaurants in Tokyo
   ```bash
   node tests/test-openai-places.js
   ```

5. **test-openai-time.js** - Get current server time
   ```bash
   node tests/test-openai-time.js
   ```

6. **test-openai-multi-news.js** - Multiple news topics in one query
   ```bash
   node tests/test-openai-multi-news.js
   ```

7. **test-openai-multi-conversions.js** - Multiple unit conversions
   ```bash
   node tests/test-openai-multi-conversions.js
   ```

8. **test-openai-news-places.js** - Mixed query: news + places
   ```bash
   node tests/test-openai-news-places.js
   ```

9. **test-openai-conversion-places.js** - Mixed query: conversion + places
   ```bash
   node tests/test-openai-conversion-places.js
   ```

### Gemini Endpoint Tests (`/query-gemini`)

1. **test-gemini-time.js** - Get current time
   ```bash
   node tests/test-gemini-time.js
   ```

2. **test-gemini-units.js** - Convert units (km to miles)
   ```bash
   node tests/test-gemini-units.js
   ```

3. **test-gemini-places.js** - Find Italian restaurants in Chicago
   ```bash
   node tests/test-gemini-places.js
   ```

4. **test-gemini-news.js** - Get quantum computing breakthroughs
   ```bash
   node tests/test-gemini-news.js
   ```

5. **test-gemini-multi-places.js** - Multiple locations for coffee shops
   ```bash
   node tests/test-gemini-multi-places.js
   ```

6. **test-gemini-time-news.js** - Mixed query: time + news
   ```bash
   node tests/test-gemini-time-news.js
   ```

7. **test-gemini-all-tools.js** - All tools combined in one query
   ```bash
   node tests/test-gemini-all-tools.js
   ```

## Running Multiple Tests

Run all tests sequentially with a delay between them:
```bash
for file in tests/test-*.js; do
  echo "\n🚀 Running $file..."
  node "$file"
  sleep 2
done
```

Run all OpenAI tests:
```bash
for file in tests/test-openai-*.js; do
  echo "\n🚀 Running $file..."
  node "$file"
  sleep 2
done
```

Run all Gemini tests:
```bash
for file in tests/test-gemini-*.js; do
  echo "\n🚀 Running $file..."
  node "$file"
  sleep 2
done
```

## Cloud Run Testing & Comparison

### Testing Against Cloud Run

After deploying to Google Cloud Run, update your `.env` file with the Cloud Run URL:

```env
BASE_URL=https://debug-nodejs-llm-tools-abc123-uc.a.run.app
```

Then run the test scripts as normal - they will hit your Cloud Run service instead of localhost:

```bash
node tests/test-openai-news.js      # Hits Cloud Run
node tests/test-gemini-time.js      # Hits Cloud Run
```

### Comparing Localhost vs Cloud Run

#### Option 1: Compare with Node.js Script

Run the comparison script to test both environments simultaneously:

```bash
node tests/compare-environments.js
```

This script will:
- Test the same queries against both localhost and Cloud Run
- Measure response times for each environment
- Display HTTP status codes
- Show response sizes and token usage
- Provide side-by-side comparison

Ensure `CLOUD_RUN_URL` is set in your `.env` file:
```env
CLOUD_RUN_URL=https://your-cloud-run-service.a.run.app
```

### What to Compare

When comparing localhost vs Cloud Run, key metrics include:

| Metric | Description | Expected Result |
|--------|-------------|-----------------|
| **Response Time** | Milliseconds to get response | Cloud Run typically 1-3s, localhost <1s |
| **HTTP Status** | HTTP response code | Both should be 200 OK |
| **Tool Calls** | Which functions were invoked | Should be identical for same query |
| **Token Usage** | API tokens consumed | Should be identical for same query |
| **Response Content** | Actual answer/summary | Should be identical |
| **Error Handling** | How errors are returned | Should be identical |
| **Uptime** | Service availability | Cloud Run accessible globally |

### Example Comparison Session

```bash
# 1. Start your local server
node server.js

# 2. Deploy to Cloud Run (see HowToRun.md section 22)
gcloud run deploy debug-nodejs-llm-tools ...

# 3. Set environment variables
export CLOUD_RUN_URL="https://debug-nodejs-llm-tools-abc123-uc.a.run.app"

# 4. Run individual tests against localhost
node tests/test-openai-news.js

# 5. Update .env to use Cloud Run
echo "BASE_URL=$CLOUD_RUN_URL" >> .env

# 6. Run same test against Cloud Run
node tests/test-openai-news.js

# 7. Run automated Node.js comparison
node tests/compare-environments.js

# 8. Review logs from Cloud Run
gcloud run services logs read debug-nodejs-llm-tools --limit 50 --region us-central1
```

---

Each test prints:
- The endpoint being tested
- The base URL being used
- The full JSON response from the server

### OpenAI Response Structure
```json
{
  "tool_calls": [...],
  "summary": "...",
  "tokens_used": 123,
  "estimated_cost_usd": 0.00123
}
```

### Gemini Response Structure
```json
{
  "gemini_tool_calls": [...],
  "summary": "..."
}
```

## Troubleshooting

### Connection Refused
- Make sure the server is running: `node server.js`
- Check that the PORT is correct (default 3000)
- If using a custom BASE_URL, verify it's correct

### API Key Errors
- Ensure your `.env` file has valid API keys:
  - `OPENAI_API_KEY` for OpenAI tests
  - `GEMINI_API_KEY` for Gemini tests
  - `NEWS_API_KEY` for news functionality
  - `APIFY_TOKEN` for places functionality

### Timeout Errors
- Some API calls may take longer depending on network and API availability
- Try running the test again

### Missing Dependencies
- Run `npm install` from the project root
- Ensure `node-fetch` is installed for Node.js 18+
