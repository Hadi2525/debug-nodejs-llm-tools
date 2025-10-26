How to run the server and test function-calling scenarios

This project exposes a single unified endpoint POST /query that uses OpenAI function calling to decide whether to call one of two helper functions: `get_latest_news` or `get_google_places`. The examples below explain how to run the server and exercise different function-calling scenarios using cURL and simple bash loops.

1) Prerequisites

- Node 18+ (or a recent Node with ESM support)
- A shell (examples use zsh/bash)
- Environment variables (create a `.env` file in the project root):

  OPENAI_API_KEY=sk-...
  NEWS_API_KEY=...          # required for `get_latest_news`
  APIFY_TOKEN=...           # required for `get_google_places`
  PORT=3000                 # optional, defaults to 3000

2) Install dependencies

Run from the project root:

```bash
npm install
```

3) Start the server

```bash
# using the default script: run the main file directly
node server.js

# server will listen on $PORT (default 3000)
```

You should see a timestamped message like: "🚀 Server running on port 3000" in the terminal.

4) Basic request format

Endpoint: POST http://localhost:3000/query

Payload JSON shape:

{ "query": "<natural language query for the assistant>" }

The AI will interpret the query and may call one of the functions defined in `tools.js`:
- `get_latest_news` — expects { topic, language? }
- `get_google_places` — expects { city, query, language?, maxResults? }

5) Example: ask for latest news (let the model choose the function)

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Give me the latest news about OpenAI"}' | jq
```

5.1) Force a function call (useful for testing specific tool behavior)

The server delegates function-calling decisions to OpenAI. To test a particular function without relying on the model's intent, craft the query to clearly ask for the specific action:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_latest_news with topic=\"OpenAI\""}' | jq
```

Or for places:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_google_places to find best pizza in New York City"}' | jq
```

6) Call a function multiple times in separate requests

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

7) Call both functions (mixed) — sequentially or concurrently

Sequential example: first get news, then places.

```bash
curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Get latest news about quantum computing"}' | jq

curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Find top sushi restaurants in San Francisco"}' | jq
```

Concurrent example (background requests):

```bash
curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Get latest news about quantum computing"}' &
curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Find top sushi restaurants in San Francisco"}' &
wait
```

8) Repeated function calling within a single natural-language session

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

9) Testing high-frequency/multiple function calls (load testing)

Simple rapid-fire test (caution: this will use API credits):

```bash
for i in {1..5}; do
  curl -sS -X POST http://localhost:3000/query -H 'Content-Type: application/json' -d '{"query":"Get latest news about AI"}' &
done
wait
```

10) Troubleshooting

- If you see errors about missing keys, ensure `.env` contains the required variables and you restarted the server after editing.
- For `get_google_places`, ensure `APIFY_TOKEN` is valid; Apify runs can fail if quota or token is invalid.
- If OpenAI returns unexpected behavior (no function call), try making the query explicit or include keywords like "call" and the function name.
- Check server logs (printed to console) for timestamped details about token usage and errors.

11) Notes and safety

- Each request may call out to external APIs (News API, Apify). Those calls can be slow — adjust client timeouts accordingly.
- API usage will consume OpenAI credits; the server prints a crude cost estimate to the console and returns tokens/cost estimates in the JSON response.

12) Example: full cURL request to trigger `get_google_places` with explicit args

Because the server relies on the model to choose the function, you can test the underlying function directly by calling the `/query` endpoint with an explicit natural-language query that mentions the arguments. Example testing payload that hints at parameters:

```bash
curl -sS -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Call get_google_places for city=\"San Francisco, CA\" and query=\"vegan restaurants\" maxResults=10"}' | jq
```

If you'd like, I can add a tiny Node or Python script to call the functions directly (bypassing OpenAI) for faster local testing. Ask for "add test runner" and I will create it.

---

Last verified: October 26, 2025
