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
  - `POST /query-gemini` - Google Gemini function calling (gemini-2.5-flash-lite)

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

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Give me the latest news about OpenAI"}' | jq
```

7) Example: Use Gemini endpoint

```bash
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What are the latest developments in quantum computing?"}' | jq
```

8) Example: Test the new demo tools

**Convert units:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Convert 25 Celsius to Fahrenheit"}' | jq
```

**Get current time:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What time is it on the server?"}' | jq
```

9) Force a specific function call

The server delegates function-calling decisions to the LLM. To test a particular function without relying on the model's intent, craft the query to clearly ask for the specific action:

**Explicit news query:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_latest_news with topic=\"blockchain\""}' | jq
```

**Explicit places query:**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_google_places to find best pizza in New York City"}' | jq
```

10) Call functions multiple times in separate requests

You can issue multiple requests sequentially. Example: search several topics for news.

```bash
for topic in "AI" "blockchain" "climate"; do
  echo "\n=== topic: $topic ==="
  curl -sS -X POST http://localhost:3000/query \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"Get latest news about $topic\"}" | jq
  sleep 1
done
```

11) Call both functions (mixed) — sequentially or concurrently

**Sequential example:** first get news, then places.

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Get latest news about quantum computing"}' | jq

curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find top sushi restaurants in San Francisco"}' | jq
```

**Concurrent example** (background requests):

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Get latest news about quantum computing"}' &

curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Find top sushi restaurants in San Francisco"}' &

wait
```

12) Compare OpenAI vs Gemini function calling

Test the same query on both endpoints to compare behavior:

```bash
# OpenAI
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is 100 kilometers in miles?"}' | jq

# Gemini
curl -sS -X POST http://localhost:3000/query-gemini \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is 100 kilometers in miles?"}' | jq
```

13) Repeated function calling within a single natural-language session

The server flow interprets an incoming query, calls a function once if requested, then sends the results back to the model for summarization. It doesn't currently support multi-turn stateful conversations in a single HTTP call (i.e., multiple back-and-forth function calls in the same request). To simulate multi-step function calling you can:

- Issue a request that asks for several subtasks (e.g., "Find restaurants in NYC and return 3 recent articles about restaurant trends") — the model may choose to call multiple functions if it's able to pack the needed calls into the function schema. Results vary by model behavior.
- Or orchestrate multiple HTTP requests from your client, feeding the previous summary into the next request's `query` so the assistant picks up context.

Example: chain two requests programmatically (pseudo-shell):

```bash
# 1) Get places
places_json=$(curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Find best coffee shops in Seattle"}')

# 2) Use the summary or results in a follow-up query
summary=$(echo "$places_json" | jq -r '.summary // ""')
curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d "{\"query\":\"Summarize these places and recommend the top 3 for a remote worker: $summary\"}" | jq
```

14) Testing high-frequency/multiple function calls (load testing)

Simple rapid-fire test (caution: this will use API credits):

```bash
for i in {1..5}; do
  curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Get latest news about AI"}' &
done
wait
```

15) Troubleshooting

**Missing API Keys:**
- If you see errors about missing keys, ensure `.env` contains all required variables (OPENAI_API_KEY, GEMINI_API_KEY, NEWS_API_KEY, APIFY_TOKEN)
- Restart the server after editing `.env`

**Google Places Issues:**
- For `get_google_places`, ensure `APIFY_TOKEN` is valid
- Apify runs can fail if quota is exceeded or token is invalid
- The function polls for up to 2 minutes; very large queries may time out

**Function Not Called:**
- If OpenAI/Gemini returns unexpected behavior (no function call), try making the query more explicit
- Include keywords like "call" and the function name in your query
- Check server logs (printed to console) for timestamped details

**Gemini Specific:**
- Ensure `GEMINI_API_KEY` is set in `.env`
- The `/query-gemini` endpoint uses the `gemini-2.5-flash-lite` model by default
- Gemini's function calling may have different behavior than OpenAI
- The server uses the `@google/genai` package with the `GoogleGenAI` client
- API calls follow the pattern: `genai.models.generateContent()` with model, tools, systemInstruction, and contents in a single config object

16) Notes and Safety

- **External APIs:** Each request may call out to external APIs (News API, Apify). Those calls can be slow — adjust client timeouts accordingly.
- **API Costs:** API usage will consume OpenAI/Gemini credits; the server prints a crude cost estimate to the console (OpenAI only) and returns tokens/cost estimates in the JSON response.
- **Rate Limits:** Be mindful of rate limits on NewsAPI, Apify, OpenAI, and Gemini when testing with multiple requests.
- **Tool Registry:** All tools are registered in `server.js` using `registerTool()` from `tools.js`. To add new tools:
  1. Implement the function in `functions.js`
  2. Register it in `server.js` with JSON Schema parameters
  3. The tool automatically becomes available to both OpenAI and Gemini endpoints

17) Example: Full cURL request with explicit parameters

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

18) Adding New Tools

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

---

If you'd like, I can add a tiny Node or Python script to call the functions directly (bypassing LLMs) for faster local testing. Ask for "add test runner" and I will create it.

---

Last verified: October 26, 2025
