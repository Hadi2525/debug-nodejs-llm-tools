How to run the server and test function-calling scenarios

This project demonstrates LLM function calling with two providers (OpenAI and Google Gemini). It exposes endpoints that use function calling to intelligently route queries to helper functions like `get_latest_news`, `get_google_places`, `convert_units`, and `get_time`. The examples below explain how to run the server and exercise different function-calling scenarios using cURL and simple bash loops.

1) Prerequisites

- Node 18+ (or a recent Node with ESM support)
- A shell (examples use zsh/bash)
- Environment variables (create a `.env` file in the project root):

  OPENAI_API_KEY=sk-...
  GEMINI_API_KEY=...        # required for `/query-gemini` endpoint
  NEWS_API_KEY=...          # required for `get_latest_news`
  APIFY_TOKEN=...           # required for `get_google_places`
  PORT=3000                 # optional, defaults to 3000

2) Install dependencies

Run from the project root:

```bash
npm install
```

This will install all required packages including:
- `express` - web framework
- `openai` - OpenAI SDK for Chat Completions with function calling
- `@google/genai` - Google GenAI SDK for Gemini function calling
- `dotenv` - environment variable management
- `node-fetch` - HTTP requests to external APIs
- `mongodb` - database driver (if needed)

3) Start the server

```bash
node server.js
```

The server will listen on $PORT (default 3000). You should see a timestamped message like: "🚀 Server running on port 3000" in the terminal.

4) Architecture Overview

The project uses a clean tool registry pattern:

- **functions.js** - Contains all tool implementations:
  - `get_latest_news` - Fetches latest news from NewsAPI
  - `get_google_places` - Finds places using Apify Google Places crawler
  - `convert_units` - Simple unit converter (c_to_f, f_to_c, km_to_miles)
  - `get_time` - Returns current server time in ISO format

- **tools.js** - Manages tool registration and provider-specific formatting:
  - `registerTool()` - Register functions with JSON Schema specs
  - `dispatch()` - Execute tool handlers by name
  - `listToolsForOpenAI()` - Format tools for OpenAI Chat Completions API
  - `listToolsForGemini()` - Format tools for Google Gemini function calling

- **server.js** - Express server with two endpoints:
  - `POST /query` - OpenAI function calling (gpt-4o)
  - `POST /query-gemini` - Google Gemini function calling (gemini-2.5-flash)

5) Available Endpoints

**5.1) POST /query** - OpenAI Function Calling

Endpoint: http://localhost:3000/query

Uses OpenAI's Chat Completions API with function calling. The model decides which tools to call based on the user query, executes them, and returns a summary.

Request format:
```json
{ "query": "<natural language query>" }
```

Response includes:
- `tool_calls` - List of tools invoked
- `summary` - Model's final answer
- `tokens_used` - Total tokens consumed
- `estimated_cost_usd` - Estimated API cost

**5.2) POST /query-gemini** - Google Gemini Function Calling

Endpoint: http://localhost:3000/query-gemini

Uses Google Gemini's function calling with multi-turn pattern. Similar behavior to OpenAI but using Gemini models.

Request format:
```json
{ "query": "<natural language query>" }
```

Response includes:
- `gemini_tool_calls` - List of tools invoked
- `summary` - Model's final answer

6) Example: Ask for latest news (OpenAI)

The LLM intelligently decides when to use tools based on natural language queries. Use implicit, conversational queries:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is happening with OpenAI lately? Any recent updates?"}' | jq
```

7) Example: Use Gemini endpoint

**Get current time:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it?"}' | jq
```

**Convert units:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"Convert 100 kilometers to miles"}' | jq
```

**Find places:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find top-rated Italian restaurants in Chicago"}' | jq
```

**Get news:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"Tell me about the latest breakthroughs in quantum computing"}' | jq
```

8) Example: Natural queries for different tools

The key is to use natural, conversational language that implies the need for specific information:

**Temperature conversion (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I want to bake something at 350 Fahrenheit. What is that in Celsius?"}' | jq
```

**Distance conversion (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am driving 150 kilometers. How many miles is that?"}' | jq
```

**Finding places (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am visiting Tokyo next week and looking for great sushi restaurants. Can you recommend some highly-rated places?"}' | jq
```

**Get current time (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need to log this event with a timestamp. What is the current time?"}' | jq
```

9) Example: Parallel function calling (multiple topics)

Ask questions that naturally require multiple tool calls. The LLM can call the same function multiple times with different parameters:

**Multiple news topics in one query:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I want to catch up on recent tech news. What are the latest developments in artificial intelligence and quantum computing?"}' | jq
```

**Multiple locations for places:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am planning trips to San Francisco and Seattle. Can you find me the best coffee shops in both cities?"}' | jq
```

**Multiple conversions:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am traveling from Canada to the US. The temperature here is 20 Celsius and I need to drive 100 kilometers. What are these in Fahrenheit and miles?"}' | jq
```

10) Example: Mixed function calling (different functions in one query)

Queries that naturally require multiple different tools:

**News + Places:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What are the recent headlines about electric vehicles, and where can I find Tesla showrooms in Los Angeles?"}' | jq
```

**Time + News:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it right now, and what are today'\''s top technology news stories?"}' | jq
```

**Conversion + Places:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"The weather in Chicago is 75 Fahrenheit. What is that in Celsius? Also, recommend some good Italian restaurants there."}' | jq
```

**All tools combined:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is the current server time? Convert 30 Celsius to Fahrenheit. Find me pizza places in New York. And tell me the latest news about climate change."}' | jq
```

11) Separate sequential requests (alternative approach)

You can also issue multiple requests sequentially if you prefer separate responses:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What are the latest developments in quantum computing?"}' | jq

**Multi-tool query (may trigger multiple function calls):**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it and convert 25 Celsius to Fahrenheit?"}' | jq
```

8) Example: Test the new demo tools

curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Where can I find authentic sushi restaurants in San Francisco?"}' | jq
```

**Loop through multiple topics:**
```bash
for topic in "artificial intelligence" "renewable energy" "space exploration"; do
  echo "\n=== Searching news for: $topic ==="
  curl -sS -X POST http://localhost:3000/query \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"Tell me about recent developments in $topic\"}" | jq
  sleep 1
done
```

**Loop through multiple cities:**
```bash
for city in "Tokyo, Japan" "Paris, France" "Dubai, UAE"; do
  echo "\n=== Finding hotels in: $city ==="
  curl -sS -X POST http://localhost:3000/query-gemini \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"I need to find luxury hotels in $city. What are the best options?\"}" | jq
  sleep 1
done
```

**Concurrent example** (background requests):

```bash
curl -sS -X POST http://localhost:3000/query \
12) Compare OpenAI vs Gemini function calling

Test the same natural query on both endpoints to compare behavior and response quality:

**Simple conversion:**
```bash
# OpenAI
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need to convert 100 kilometers to miles for my road trip"}' | jq

# Gemini
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need to convert 100 kilometers to miles for my road trip"}' | jq
```
13) Advanced: Complex parallel function calling

Both OpenAI and Gemini support parallel function calling, where multiple functions can be called simultaneously in a single request. Craft queries that naturally require multiple pieces of information:

**Multiple news topics + multiple locations:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am doing research on tech hubs. Tell me the latest news about artificial intelligence and blockchain. Also, find me coworking spaces in San Francisco and Austin, Texas."}' | jq
```

**Travel planning query:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am visiting Europe next month. What is the current time on the server for timestamp purposes? Find me boutique hotels in Paris and Rome. Also, what are the latest travel news and restrictions?"}' | jq
```

15) Testing high-frequency/multiple function calls (load testing)

Simple rapid-fire test with natural queries (caution: this will use API credits):

```bash
for i in {1..5}; do
  curl -sS -X POST http://localhost:3000/query \
    -H 'Content-Type: application/json' \
    -d '{"query":"What are the recent developments in artificial intelligence?"}' &
done
wait
```

**Stress test with varied queries:**
```bash
queries=(
  "Tell me about recent advances in renewable energy"
  "Where can I find vegan restaurants in Portland?"
  "Convert 50 kilometers to miles"
  "What time is it currently?"
  "What are the latest headlines about space exploration?"
)

for query in "${queries[@]}"; do
  curl -sS -X POST http://localhost:3000/query \
16) Troubleshootinge: application/json' \
    -d "{\"query\":\"$query\"}" &
done
wait
``` can orchestrate multiple HTTP requests, feeding previous results into subsequent queries:

```bash
# 1) Get restaurant recommendations
places_json=$(curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find the best Italian restaurants in Boston"}')

# 2) Use the results in a follow-up query
summary=$(echo "$places_json" | jq -r '.summary // ""')
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"Based on these restaurants: $summary. Which ones would be best for a romantic dinner? Consider ratings and ambiance.\"}" | jq
```bash
# OpenAI
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is 100 kilometers in miles?"}' | jq

17) Notes and Safety
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is 100 kilometers in miles?"}' | jq
```

13) Multi-Tool Queries (Single Request, Multiple Function Calls)

Both endpoints support queries that trigger multiple function calls in a single request. The model decides which tools to call based on the query.

**OpenAI - Multiple tool calls:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it and also convert 30 Celsius to Fahrenheit?"}' | jq
```

**Gemini - Multiple tool calls:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"Tell me the current time and convert 50 miles to kilometers"}' | jq
```

**Complex multi-tool query:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need three things: current time, convert 100 Fahrenheit to Celsius, and find coffee shops in Seattle"}' | jq
```

Note: Whether the model calls multiple tools depends on its interpretation of the query. Some models may choose to call tools sequentially or combine information differently.

14) Chaining Requests (Multi-Turn Conversations)

The server flow interprets an incoming query, calls a function once if requested, then sends the results back to the model for summarization. It doesn't currently support multi-turn stateful conversations in a single HTTP call (i.e., multiple back-and-forth function calls in the same request). To simulate multi-step function calling you can:

18) Natural queries for all available functions

Test each function with natural, conversational language that doesn't explicitly mention function names:

**News (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I want to stay updated on artificial intelligence. What has been happening recently in this field?"}' | jq
```

15) Testing high-frequency/multiple function calls (load testing)

Simple rapid-fire test (caution: this will use API credits):

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am visiting Calgary next week and would love to try some great coffee. Any recommendations?"}' | jq
```

16) Troubleshooting

**Distance conversion (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"My GPS says my destination is 80 kilometers away. I am used to miles - how far is that?"}' | jq
```

**Time (implicit):**
```bash
19) Python Server

The project also includes a Python/FastAPI implementation with identical functionality:

**Start the Python server:**
```bash
cd python
pip install -r requirements.txt
python server.py
```

The Python server runs on port 8000 by default and has the same endpoints:
- `POST /query` - OpenAI function calling
- `POST /query-gemini` - Gemini function calling

**Example queries (replace port 3000 with 8000):**
```bash
curl -sS -X POST http://localhost:8000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Tell me about the latest developments in quantum computing"}' | jq

curl -sS -X POST http://localhost:8000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find me the best pizza places in Chicago and New York"}' | jq
```

20) Adding New Toolsp://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I need to timestamp this event. Can you tell me the current time?"}' | jq
```

**Real-world scenario combining multiple functions:**
```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am planning a business trip. What time is it now? I will be driving 200 kilometers - how many miles is that? Find me upscale restaurants in London, UK. And tell me the latest business news."}' | jq
```or `get_google_places`, ensure `APIFY_TOKEN` is valid
- Apify runs can fail if quota is exceeded or token is invalid
- The function polls for up to 2 minutes; very large queries may time out

**Function Not Called:**
- If OpenAI/Gemini returns unexpected behavior (no function call), try making the query more explicit
- Include keywords like "call" and the function name in your query
- Check server logs (printed to console) for timestamped details

**Gemini Specific:**
- Ensure `GEMINI_API_KEY` is set in `.env`
- The `/query-gemini` endpoint uses the `gemini-2.5-flash` model
- Gemini's function calling may have different behavior than OpenAI
- The server uses the `@google/genai` package with the `GoogleGenAI` client
- Function calling uses the multi-turn pattern: first call gets function calls, execute them, then send results back wrapped in `{ functionResponse: { name, response: { result } } }`
- Tools are passed via the `config` object, not as a top-level parameter

17) Notes and Safety

- **External APIs:** Each request may call out to external APIs (News API, Apify). Those calls can be slow — adjust client timeouts accordingly.
- **API Costs:** API usage will consume OpenAI/Gemini credits; the server prints a crude cost estimate to the console (OpenAI only) and returns tokens/cost estimates in the JSON response.
- **Rate Limits:** Be mindful of rate limits on NewsAPI, Apify, OpenAI, and Gemini when testing with multiple requests.
- **Tool Registry:** All tools are registered in `server.js` using `registerTool()` from `tools.js`. To add new tools:
Last updated: November 29, 2025`functions.js`
  2. Register it in `server.js` with JSON Schema parameters
  3. The tool automatically becomes available to both OpenAI and Gemini endpoints

18) Example: Full cURL request with explicit parameters

Because the server relies on the model to choose the function, you can test the underlying function directly by calling either endpoint with an explicit natural-language query that mentions the arguments:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_google_places for city=\"San Francisco, CA\" and query=\"vegan restaurants\" maxResults=10"}' | jq
```

**Test all four functions explicitly:**

```bash
# News
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Get latest news about AI with language en"}' | jq

# Places
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find coffee shops in Calgary, Canada"}' | jq

# Unit conversion
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Convert 32 Fahrenheit to Celsius"}' | jq

# Time
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is the current server time?"}' | jq
```

19) Adding New Tools

To add a new tool to the system:

1. **Implement in functions.js:**
```javascript
export async function my_new_tool({ param1, param2 }) {
  // Your implementation here
  return { result: "success" };
}
```

2. **Register in server.js:**
```javascript
registerTool(
  {
    name: "my_new_tool",
    description: "Description of what the tool does",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "Description of param1" },
        param2: { type: "number", description: "Description of param2" },
      },
      required: ["param1"],
      additionalProperties: false,
    },
  },
  my_new_tool
);
```

3. **Import in server.js:**
```javascript
import { get_latest_news, get_google_places, convert_units, get_time, my_new_tool } from "./functions.js";
```

The tool will automatically be available to both OpenAI and Gemini endpoints!

20) Docker Deployment

Both the Node.js and Python servers can be containerized using Docker.

**20.1) Node.js Server (port 3000)**

Build and run from the project root:

```bash
# Build the image
docker build -t debug-nodejs-llm-tools .

# Run the container (pass environment variables)
docker run -p 3000:3000 --env-file .env debug-nodejs-llm-tools

# Or pass environment variables individually
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e GEMINI_API_KEY=... \
  -e NEWS_API_KEY=... \
  -e APIFY_TOKEN=... \
  debug-nodejs-llm-tools
```

**20.2) Python/FastAPI Server (port 8000)**

Build and run from the `python/` directory:

```bash
cd python

# Build the image
docker build -t debug-python-llm-tools .

# Run the container
docker run -p 8000:8000 --env-file .env debug-python-llm-tools

# Or pass environment variables individually
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  -e GEMINI_API_KEY=... \
  -e NEWS_API_KEY=... \
  -e APIFY_TOKEN=... \
  debug-python-llm-tools
```

**20.3) Run Both Containers Together**

```bash
# Start Node.js server on port 3000
docker run -d --name nodejs-server -p 3000:3000 --env-file .env debug-nodejs-llm-tools

# Start Python server on port 8000
docker run -d --name python-server -p 8000:8000 --env-file python/.env debug-python-llm-tools

# Test both
curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"What time is it?"}' | jq
curl -sS -X POST http://localhost:8000/query -H 'Content-Type: application/json' -d '{"query":"What time is it?"}' | jq

# Stop containers
docker stop nodejs-server python-server
docker rm nodejs-server python-server
```

**20.4) Docker Notes**

- The `.dockerignore` files exclude unnecessary files (node_modules, .env, docs, etc.) to keep images small
- Environment variables should be passed at runtime, not baked into the image
- The Node.js image uses `node:20-alpine` (~180MB) for a smaller footprint
- The Python image uses `python:3.12-slim` (~150MB) for a smaller footprint

---

21) Push Docker Image to Google Cloud Artifact Registry (GCR)

This section explains how to push your local Docker images to Google Cloud Container Registry (gcr.io).

**21.1) Prerequisites**

- Google Cloud SDK (`gcloud`) installed
- A Google Cloud project with billing enabled
- Docker installed and running

**21.2) Authenticate with Google Cloud**

```bash
# Login to Google Cloud
gcloud auth login

# Verify your account
gcloud auth list
```

**21.3) Find Your Project ID**

Important: Google Cloud uses **Project ID**, not Project Name. They are often different!

```bash
# List all projects to find the correct PROJECT_ID
gcloud projects list
```

Example output:
```
PROJECT_ID              NAME                 PROJECT_NUMBER
my-project-id-123456    My Project Name      123456789012
```

Use the value in the `PROJECT_ID` column, not the `NAME` column.

**21.4) Set Your Project**

```bash
gcloud config set project <YOUR_PROJECT_ID>

# Verify the project is set
gcloud config get-value project
```

**21.5) Enable the Artifact Registry API**

```bash
gcloud services enable artifactregistry.googleapis.com
```

If you get a permission error, you can also enable it via the Google Cloud Console:
1. Go to: https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com
2. Select your project
3. Click "Enable"

Note: Wait 2-3 minutes after enabling for the change to propagate.

**21.6) Configure Docker for GCR**

```bash
gcloud auth configure-docker gcr.io
```

This updates your Docker config to use gcloud credentials for gcr.io.

**21.7) Tag Your Local Image**

```bash
# Format: gcr.io/<PROJECT_ID>/<IMAGE_NAME>:<TAG>
docker tag debug-nodejs-llm-tools gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1

# For the Python image
docker tag debug-python-llm-tools gcr.io/<YOUR_PROJECT_ID>/debug-python-llm-tools:v0.1
```

**21.8) Push to GCR**

```bash
# Push Node.js image
docker push gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1

# Push Python image
docker push gcr.io/<YOUR_PROJECT_ID>/debug-python-llm-tools:v0.1
```

**21.9) Verify the Push**

```bash
# List images in your GCR
gcloud container images list --repository=gcr.io/<YOUR_PROJECT_ID>

# List tags for a specific image
gcloud container images list-tags gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools
```

**21.10) Pull Image from GCR (on another machine)**

```bash
# Authenticate Docker on the new machine
gcloud auth configure-docker gcr.io

# Pull the image
docker pull gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1
```

**21.11) Troubleshooting**

| Error | Cause | Solution |
|-------|-------|----------|
| `Artifact Registry API has not been used` | API not enabled | Run `gcloud services enable artifactregistry.googleapis.com` |
| `PERMISSION_DENIED` | Wrong project or no access | Verify project with `gcloud projects list` and set correct project |
| `does not have permission to access projects instance` | Using project name instead of ID | Use the PROJECT_ID from `gcloud projects list`, not the display name |
| `denied: Token exchange failed` | Docker not configured | Run `gcloud auth configure-docker gcr.io` |
| Billing error | Billing not enabled | Link a billing account at https://console.cloud.google.com/billing |

**21.12) Using Artifact Registry (Newer Alternative)**

Google recommends Artifact Registry over Container Registry. The format is slightly different:

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker <REGION>-docker.pkg.dev

# Create a repository (one-time setup)
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=<REGION> \
  --description="Docker repository"

# Tag for Artifact Registry
docker tag debug-nodejs-llm-tools <REGION>-docker.pkg.dev/<PROJECT_ID>/docker-repo/debug-nodejs-llm-tools:v0.1

# Push
docker push <REGION>-docker.pkg.dev/<PROJECT_ID>/docker-repo/debug-nodejs-llm-tools:v0.1
```

Replace `<REGION>` with your preferred region (e.g., `us-central1`, `us`, `europe-west1`).

---

## 22) Deploy to Google Cloud Run

Google Cloud Run allows you to deploy containerized applications without managing servers. It automatically scales based on traffic and you only pay for the execution time.

### 22.1) Prerequisites for Cloud Run

- Docker image already pushed to GCR or Artifact Registry (see section 21)
- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated

### 22.2) Deploy Node.js Service to Cloud Run

```bash
# Deploy from GCR
gcloud run deploy debug-nodejs-llm-tools \
  --image gcr.io/<YOUR_PROJECT_ID>/debug-nodejs-llm-tools:v0.1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=<YOUR_KEY>,GEMINI_API_KEY=<YOUR_KEY>,NEWS_API_KEY=<YOUR_KEY>,APIFY_TOKEN=<YOUR_TOKEN>,PORT=3000"
```

Or from Artifact Registry:

```bash
gcloud run deploy debug-nodejs-llm-tools \
  --image us-central1-docker.pkg.dev/<YOUR_PROJECT_ID>/docker-repo/debug-nodejs-llm-tools:v0.1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=<YOUR_KEY>,GEMINI_API_KEY=<YOUR_KEY>,NEWS_API_KEY=<YOUR_KEY>,APIFY_TOKEN=<YOUR_TOKEN>,PORT=3000"
```

**Important Notes:**
- `--platform managed` means Cloud Run handles infrastructure (recommended)
- `--allow-unauthenticated` allows public access (remove for private services)
- `--region` can be `us-central1`, `us-east1`, `europe-west1`, etc.
- Replace `<YOUR_KEY>` and `<YOUR_TOKEN>` with actual values

### 22.3) Get Your Cloud Run Service URL

After deployment completes, you'll see output like:
```
Service URL: https://debug-nodejs-llm-tools-abc123-uc.a.run.app
```

Save this URL. You'll use it to test the deployed service.

### 22.4) Verify Cloud Run Deployment

```bash
# List all deployed services
gcloud run services list

# Get detailed service info
gcloud run services describe debug-nodejs-llm-tools --region us-central1

# View logs (tail last 50 lines)
gcloud run services logs read debug-nodejs-llm-tools --limit 50 --region us-central1
```

---

## 23) Testing Deployed App on Cloud Run

### 23.1) Set Environment Variables for Testing

```bash
# Store your Cloud Run URL
export CLOUD_RUN_URL="https://debug-nodejs-llm-tools-abc123-uc.a.run.app"

# Keep localhost for comparison
export LOCALHOST_URL="http://localhost:3000"
```

### 23.2) Using the Test Scripts with Cloud Run

Update the `.env` file with your Cloud Run URL:

```env
BASE_URL=https://debug-nodejs-llm-tools-abc123-uc.a.run.app
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
NEWS_API_KEY=...
APIFY_TOKEN=...
PORT=3000
```

Then run test scripts normally:

```bash
node tests/test-openai-news.js      # Will hit Cloud Run
node tests/test-gemini-time.js      # Will hit Cloud Run
```

### 23.3) Direct cURL Testing Against Cloud Run

**Test OpenAI endpoint:**

```bash
curl -X POST https://debug-nodejs-llm-tools-abc123-uc.a.run.app/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is happening with OpenAI lately?"}'
```

**Test Gemini endpoint:**

```bash
curl -X POST https://debug-nodejs-llm-tools-abc123-uc.a.run.app/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it?"}'
```

**Test with jq for pretty output:**

```bash
curl -sS -X POST https://debug-nodejs-llm-tools-abc123-uc.a.run.app/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Convert 100 kilometers to miles"}' | jq
```

---

## 24) Comparing Localhost vs Cloud Run

### 24.1) Create a Comparison Test Script

Create a file `tests/compare-environments.js`:

```javascript
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const LOCALHOST_URL = 'http://localhost:3000';
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

if (!CLOUD_RUN_URL) {
  console.error('❌ Error: CLOUD_RUN_URL not set in .env');
  process.exit(1);
}

async function compareEndpoints(query, endpoint) {
  const testName = `${endpoint} (${query.substring(0, 40)}...)`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Testing: ${testName}`);
  console.log('='.repeat(80));
  
  const path = endpoint.includes('gemini') ? 'query-gemini' : 'query';
  
  try {
    // Test localhost
    console.log(`\n🌐 Testing LOCALHOST: ${LOCALHOST_URL}/${path}`);
    const localhostStart = Date.now();
    
    const localhostResponse = await fetch(`${LOCALHOST_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    const localhostTime = Date.now() - localhostStart;
    const localhostData = await localhostResponse.json();
    
    console.log(`⏱️ Response time: ${localhostTime}ms`);
    console.log(`✅ Status: ${localhostResponse.status}`);
    console.log(`📦 Response size: ${JSON.stringify(localhostData).length} bytes`);
    
    if (localhostData.tokens_used) {
      console.log(`🔢 Tokens used: ${localhostData.tokens_used}`);
    }
    
  } catch (error) {
    console.error(`❌ Localhost Error: ${error.message}`);
  }
  
  try {
    // Test Cloud Run
    console.log(`\n☁️ Testing CLOUD RUN: ${CLOUD_RUN_URL}/${path}`);
    const cloudStart = Date.now();
    
    const cloudResponse = await fetch(`${CLOUD_RUN_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    const cloudTime = Date.now() - cloudStart;
    const cloudData = await cloudResponse.json();
    
    console.log(`⏱️ Response time: ${cloudTime}ms`);
    console.log(`✅ Status: ${cloudResponse.status}`);
    console.log(`📦 Response size: ${JSON.stringify(cloudData).length} bytes`);
    
    if (cloudData.tokens_used) {
      console.log(`🔢 Tokens used: ${cloudData.tokens_used}`);
    }
    
  } catch (error) {
    console.error(`❌ Cloud Run Error: ${error.message}`);
  }
  
  console.log();
}

async function runComparison() {
  const queries = [
    { query: 'What time is it?', type: 'gemini' },
    { query: 'Convert 100 kilometers to miles', type: 'gemini' },
    { query: 'I want to bake at 350 Fahrenheit. What is that in Celsius?', type: 'openai' },
    { query: 'What are recent developments in AI?', type: 'openai' },
  ];
  
  console.log('🚀 Starting Localhost vs Cloud Run Comparison');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  for (const { query, type } of queries) {
    const endpoint = type === 'gemini' ? 'query-gemini' : 'query';
    await compareEndpoints(query, endpoint);
  }
  
  console.log('✨ Comparison complete!');
}

runComparison().catch(console.error);
```

Run it with:

```bash
node tests/compare-environments.js
```

### 24.2) Key Metrics to Compare

When comparing localhost vs Cloud Run, look for:

| Metric | Localhost | Cloud Run | Notes |
|--------|-----------|-----------|-------|
| **Response Time** | <1s typical | 1-3s (cold start may be higher) | Cold starts add 2-5s overhead |
| **HTTP Status Code** | 200 | 200 | Both should return 200 OK |
| **Token Usage** | Same query = same tokens | Same query = same tokens | Should be identical |
| **Response Size** | Exact match | Exact match | JSON should be identical |
| **Error Handling** | Same errors | Same errors | Errors should match |
| **Availability** | Local only | Global (depending on region) | Cloud Run is accessible from anywhere |
| **Concurrency** | Limited by machine | Scales automatically | Cloud Run handles multiple requests |

### 24.3) Troubleshooting Cloud Run Tests

**Issue: `Connection refused` when testing Cloud Run**
```bash
# Verify the service is running
gcloud run services describe debug-nodejs-llm-tools --region us-central1

# Check if URL is correct
gcloud run services list --region us-central1
```

**Issue: `401 Unauthorized`**
```bash
# Check if service allows unauthenticated access
gcloud run services update debug-nodejs-llm-tools \
  --allow-unauthenticated \
  --region us-central1
```

**Issue: `500 Internal Server Error` on Cloud Run but works on localhost**
```bash
# Check Cloud Run logs
gcloud run services logs read debug-nodejs-llm-tools \
  --limit 100 \
  --region us-central1

# Check if all environment variables are set
gcloud run services describe debug-nodejs-llm-tools \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env[*].value)'
```

**Issue: API requests timing out on Cloud Run**
- Increase Cloud Run timeout: 
```bash
gcloud run services update debug-nodejs-llm-tools \
  --timeout 600 \
  --region us-central1
```

---

Last verified: December 16, 2025
