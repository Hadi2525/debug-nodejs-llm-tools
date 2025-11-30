# server.py
import os
import json
from datetime import datetime
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import openai
from google import genai
from google.genai import types

from tools import register_tool, dispatch, list_tools_for_openai, list_tools_for_gemini
from functions import get_latest_news, get_google_places, convert_units, get_time

load_dotenv()

app = FastAPI()

# -----------------------
# Register tools
# -----------------------
register_tool(
    {
        "name": "get_latest_news",
        "description": "Fetches the most recent news articles and headlines about a specific topic from NewsAPI. Returns up to 5 latest articles with titles, sources, URLs, and publication dates. Use this when the user asks about current events, recent news, latest developments, or wants to know what's happening with a particular subject. Topics can be anything newsworthy: technology, politics, sports, science, entertainment, companies, people, or events.",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "The subject or keyword to search for news about. Can be a single word like 'bitcoin', a phrase like 'climate change', a company name like 'Tesla', a person like 'Elon Musk', or any newsworthy subject. Be specific for better results."},
                "language": {"type": "string", "description": "Two-letter ISO 639-1 language code to filter news articles. Examples: 'en' for English (default), 'es' for Spanish, 'fr' for French, 'de' for German, 'ja' for Japanese. Use this to get news in the user's preferred language."},
            },
            "required": ["topic"],
            "additionalProperties": False,
        },
    },
    get_latest_news,
)

register_tool(
    {
        "name": "get_google_places",
        "description": "Searches for and retrieves detailed information about businesses, restaurants, shops, services, and points of interest in a specific city or location using Google Places data via Apify. Returns comprehensive details including names, ratings, review counts, addresses, phone numbers, websites, and Google Maps links. Use this when the user wants to find places to eat, shop, visit, or get services in a particular area. Examples: finding restaurants, coffee shops, hotels, gyms, museums, parks, stores, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "The city, area, or location to search in. Be specific and include state/country if needed for clarity. Examples: 'Edmonton, Canada', 'San Francisco, CA', 'Tokyo, Japan', 'London, UK', 'New York City', 'Paris, France'. Can also be neighborhoods or specific areas like 'Downtown Seattle'."},
                "query": {"type": "string", "description": "The type of place, business category, or specific search term. Be descriptive and specific. Examples: 'pizza restaurants', 'italian food', 'coffee shops', 'vegan restaurants', '5-star hotels', 'yoga studios', 'bookstores', 'sushi', 'breweries', 'fast food'. Use keywords that match what the user is looking for."},
                "language": {"type": "string", "description": "Language code for the results and interface. Use ISO 639-1 codes: 'en' (English, default), 'es' (Spanish), 'fr' (French), 'de' (German), etc."},
                "maxResults": {"type": "integer", "description": "Maximum number of places to return. Range: 1-200. Default is 50. Use lower numbers (5-20) for quick results or top recommendations. Use higher numbers (50-200) for comprehensive searches. Note: higher values increase processing time."},
            },
            "required": ["city", "query"],
            "additionalProperties": False,
        },
    },
    get_google_places,
)

register_tool(
    {
        "name": "convert_units",
        "description": "Converts between common units of measurement for temperature and distance. Supports three conversion types: Celsius to Fahrenheit, Fahrenheit to Celsius, and kilometers to miles. Use this when the user needs to convert temperatures between metric and imperial systems or convert distances. Provides instant, accurate conversions without external API calls.",
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["c_to_f", "f_to_c", "km_to_miles"], "description": "The type of conversion to perform. Choose 'c_to_f' to convert Celsius to Fahrenheit (e.g., for US weather), 'f_to_c' to convert Fahrenheit to Celsius (e.g., for metric system), or 'km_to_miles' to convert kilometers to miles (e.g., for distance/speed conversions)."},
                "value": {"type": "number", "description": "The numeric value to convert. Can be an integer or decimal number. For temperature, this is the degrees in the source unit. For distance, this is the kilometers to convert to miles."},
            },
            "required": ["kind", "value"],
            "additionalProperties": False,
        },
    },
    convert_units,
)

register_tool(
    {
        "name": "get_time",
        "description": "Returns the current date and time from the server in standardized ISO 8601 format with UTC timezone. Use this when the user asks 'what time is it', 'what's the current time', 'what's the date today', or needs to know the current timestamp. The time is always in UTC (Coordinated Universal Time), which is the global time standard. Useful for time-sensitive queries, scheduling, logging, or when users need to know the exact current moment.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    get_time,
)

# -----------------------
# Clients
# -----------------------
openai.api_key = os.getenv("OPENAI_API_KEY")
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# -----------------------
# Helpers
# -----------------------
MODEL_PRICING = {"input": 0.005, "output": 0.015}  # example pricing


def log(message: str, data: Any = None):
    timestamp = datetime.utcnow().isoformat() + "Z"
    if data:
        print(f"[{timestamp}] {message}", data)
    else:
        print(f"[{timestamp}] {message}")


def cost_from_usage(usage: Dict[str, int]) -> float:
    if not usage:
        return 0.0
    in_cost = (usage.get("prompt_tokens", 0) / 1000) * MODEL_PRICING["input"]
    out_cost = (usage.get("completion_tokens", 0) / 1000) * MODEL_PRICING["output"]
    return in_cost + out_cost


# -----------------------
# Request Models
# -----------------------
class QueryRequest(BaseModel):
    query: str


# =======================================================
# POST /query -> OpenAI (Chat Completions) with tools
# =======================================================
@app.post("/query")
async def query_openai(request: QueryRequest):
    query = request.query
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body.")
    
    log("📩 /query", {"query": query})
    total_tokens = 0
    total_cost = 0.0
    
    try:
        # Step 1: Ask OpenAI with tools
        client = openai.OpenAI(api_key=openai.api_key)
        first = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": query}],
            tools=list_tools_for_openai(),
            tool_choice="auto",
        )
        
        usage1 = first.usage
        if usage1:
            total_tokens += usage1.total_tokens or 0
            total_cost += cost_from_usage({
                "prompt_tokens": usage1.prompt_tokens,
                "completion_tokens": usage1.completion_tokens,
            })
        
        assistant_msg = first.choices[0].message
        calls = assistant_msg.tool_calls or []
        
        if not calls:
            log("ℹ️ No tool call; returning assistant text")
            return {
                "response": assistant_msg.content,
                "tokens_used": total_tokens,
                "estimated_cost_usd": round(total_cost, 6),
            }
        
        # Step 2: Execute tool calls
        tool_responses = []
        for call in calls:
            name = call.function.name
            args_string = call.function.arguments
            args = json.loads(args_string) if args_string else {}
            log(f"⚙️ {name}", args)
            
            result = await dispatch(name, args)
            tool_responses.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(result),
                "name": name,
            })
        
        # Step 3: Ask OpenAI to summarize
        messages = [
            {"role": "user", "content": query},
            assistant_msg.model_dump(),
        ] + tool_responses
        
        final = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )
        
        usage2 = final.usage
        if usage2:
            total_tokens += usage2.total_tokens or 0
            total_cost += cost_from_usage({
                "prompt_tokens": usage2.prompt_tokens,
                "completion_tokens": usage2.completion_tokens,
            })
        
        return {
            "tool_calls": [{"name": c.function.name} for c in calls],
            "summary": final.choices[0].message.content,
            "tokens_used": total_tokens,
            "estimated_cost_usd": round(total_cost, 6),
        }
    
    except Exception as err:
        log("❌ /query error", str(err))
        raise HTTPException(status_code=500, detail=str(err))


# ==================================================================
# POST /query-gemini -> Gemini function calling (multi-turn pattern)
# ==================================================================
@app.post("/query-gemini")
async def query_gemini(request: QueryRequest):
    query = request.query
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body.")
    
    log("📩 /query-gemini", {"query": query})
    
    try:
        # Step 1: Create tools config
        gemini_tools = list_tools_for_gemini()
        tools = types.Tool(function_declarations=gemini_tools)
        config = types.GenerateContentConfig(
            tools=[tools],
            system_instruction="You are a helpful assistant. When you use tools to fetch information, always present the results with full details including titles, sources, URLs, and dates. Be comprehensive and include all relevant information from the tool results. When a question has multiple parts, use all available tools to answer each part thoroughly.",
        )
        
        # First turn with tools
        first = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query,
            config=config,
        )
        
        # Extract ALL function calls from the response (parallel function calling)
        function_calls = []
        if first.candidates and first.candidates[0].content.parts:
            for part in first.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    function_calls.append({
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args),
                    })
        
        if not function_calls:
            # No tools needed
            text = first.text if hasattr(first, 'text') else "(no text)"
            return {"response": text}
        
        # Step 2: Execute ALL function calls (parallel execution)
        function_responses = []
        for fc in function_calls:
            name = fc["name"]
            args = fc["args"]
            log(f"⚙️ Gemini tool call: {name}", args)
            result = await dispatch(name, args)
            
            # Ensure result is a dictionary for Gemini API
            if isinstance(result, list):
                result = {"results": result}
            elif not isinstance(result, dict):
                result = {"value": result}
            
            function_responses.append(
                types.Part(function_response=types.FunctionResponse(name=name, response=result))
            )
        
        # Step 3: Send all function responses back
        second = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(role="user", parts=[types.Part(text=query)]),
                first.candidates[0].content,
                types.Content(role="model", parts=function_responses),
            ],
            config=config,
        )
        
        final_text = second.text if hasattr(second, 'text') else ""
        
        return {
            "gemini_tool_calls": [{"name": fc["name"]} for fc in function_calls],
            "summary": final_text,
        }
    
    except Exception as err:
        log("❌ /query-gemini error", str(err))
        raise HTTPException(status_code=500, detail=str(err))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    log(f"🚀 Server running at http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
