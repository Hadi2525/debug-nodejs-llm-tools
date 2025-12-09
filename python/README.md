# Python FastAPI LLM Tools Server

This is a Python/FastAPI implementation of the Node.js LLM tools server. It provides the same functionality using OpenAI and Gemini APIs with function calling.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

Note: This uses the new `google-genai` library (not `google-generativeai`).

2. Make sure you have a `.env` file in the root directory with:
```
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
NEWS_API_KEY=your_news_api_key
APIFY_TOKEN=your_apify_token
PORT=8000
```

## Run

```bash
python server.py
```

Or with uvicorn directly:
```bash
uvicorn server:app --reload --port 8000
```

## API Endpoints

### POST /query
OpenAI-based query with function calling
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the current time?"}'
```

### POST /query-gemini
Gemini-based query with function calling
```bash
curl -X POST http://localhost:8000/query-gemini \
  -H "Content-Type: application/json" \
  -d '{"query": "Convert 32 degrees Fahrenheit to Celsius"}'
```

## Available Tools

1. **get_latest_news** - Fetch latest news headlines
2. **get_google_places** - Find places using Apify Google Places
3. **convert_units** - Convert between c_to_f, f_to_c, km_to_miles
4. **get_time** - Get current server time in ISO format
