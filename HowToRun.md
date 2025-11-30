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

The LLM intelligently decides when to use tools based on natural language queries. Use implicit, conversational queries:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is happening with OpenAI lately? Any recent updates?"}' | jq
```

7) Example: Use Gemini endpoint

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

sleep 1

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
**Function Not Called:**
- If OpenAI/Gemini returns unexpected behavior (no function call), try making the query more specific about what information you need
- Use natural language that clearly indicates you need real-time data, current information, or external resources
- Avoid overly vague queries - be specific about locations, topics, or values you want to convert
- Check server logs (printed to console) for timestamped details
13) Repeated function calling within a single natural-language session

The server flow interprets an incoming query, calls a function once if requested, then sends the results back to the model for summarization. It doesn't currently support multi-turn stateful conversations in a single HTTP call (i.e., multiple back-and-forth function calls in the same request). To simulate multi-step function calling you can:

18) Natural queries for all available functions

Test each function with natural, conversational language that doesn't explicitly mention function names:

**News (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I want to stay updated on artificial intelligence. What has been happening recently in this field?"}' | jq
```

**Places (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"I am visiting Calgary next week and would love to try some great coffee. Any recommendations?"}' | jq
```

**Temperature conversion (implicit):**
```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"It is 32 degrees Fahrenheit outside. Is that cold? What is it in Celsius?"}' | jq
```

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
- The `/query-gemini` endpoint uses the `gemini-2.5-flash-lite` model by default
- Gemini's function calling may have different behavior than OpenAI
- The server uses the `@google/genai` package with the `GoogleGenAI` client
- API calls follow the pattern: `genai.models.generateContent()` with model, tools, systemInstruction, and contents in a single config object

16) Notes and Safety

- **External APIs:** Each request may call out to external APIs (News API, Apify). Those calls can be slow — adjust client timeouts accordingly.
- **API Costs:** API usage will consume OpenAI/Gemini credits; the server prints a crude cost estimate to the console (OpenAI only) and returns tokens/cost estimates in the JSON response.
- **Rate Limits:** Be mindful of rate limits on NewsAPI, Apify, OpenAI, and Gemini when testing with multiple requests.
- **Tool Registry:** All tools are registered in `server.js` using `registerTool()` from `tools.js`. To add new tools:
Last updated: November 29, 2025`functions.js`
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
