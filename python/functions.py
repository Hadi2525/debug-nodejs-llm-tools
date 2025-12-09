# functions.py
import os
import httpx
import asyncio
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()


async def get_latest_news(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetch the latest news headlines on a specific topic from NewsAPI.
    
    This function queries the NewsAPI service to retrieve the most recent news articles
    about a given topic. It returns up to 5 of the latest articles sorted by publication date.
    Each article includes the title, source, URL, and publication timestamp.
    
    Args:
        args: Dictionary containing:
            - topic (str, required): The subject or keyword to search for (e.g., "quantum computing", 
              "climate change", "artificial intelligence"). Can be a single word or phrase.
            - language (str, optional): Two-letter language code (ISO 639-1) for filtering results.
              Defaults to "en" for English. Examples: "es" (Spanish), "fr" (French), "de" (German).
    
    Returns:
        List of dictionaries, each containing:
            - title (str): The headline of the article
            - source (str): The name of the news source/publisher
            - url (str): Direct link to the full article
            - publishedAt (str): ISO 8601 timestamp when the article was published
        
        Returns error dict if no articles found: {"error": "No articles found or invalid response."}
    
    Example:
        >>> await get_latest_news({"topic": "artificial intelligence", "language": "en"})
        [{'title': 'AI Breakthrough...', 'source': 'TechCrunch', 'url': 'https://...', 'publishedAt': '2025-11-28T10:00:00Z'}, ...]
    
    Note:
        Requires NEWS_API_KEY environment variable to be set with a valid NewsAPI.org API key.
    """
    topic = args.get("topic")
    language = args.get("language", "en")
    
    url = f"https://newsapi.org/v2/everything?q={topic}&language={language}&pageSize=5&sortBy=publishedAt&apiKey={os.getenv('NEWS_API_KEY')}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
    
    if not data.get("articles"):
        return {"error": "No articles found or invalid response."}
    
    return [
        {
            "title": a.get("title"),
            "source": a.get("source", {}).get("name"),
            "url": a.get("url"),
            "publishedAt": a.get("publishedAt"),
        }
        for a in data["articles"]
    ]


async def get_google_places(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find and retrieve information about places (restaurants, shops, services) in a specific location.
    
    This function uses the Apify Google Places crawler to search for businesses and points of interest
    in a given city or area. It provides detailed information including ratings, reviews, contact details,
    and addresses. The function polls the Apify API for up to 2 minutes to retrieve results.
    
    Args:
        args: Dictionary containing:
            - city (str, required): The location to search in. Can be a city name with optional state/country
              (e.g., "Calgary, Canada", "San Francisco, CA", "Tokyo, Japan", "London, UK").
            - query (str, required): The type of place or business to search for (e.g., "pizza", "coffee shops",
              "vegan restaurants", "hotels", "gyms", "bookstores"). Use specific keywords for better results.
            - language (str, optional): Language code for results. Defaults to "en" (English).
            - maxResults (int, optional): Maximum number of results to return (1-200). Defaults to 50.
              Higher values may increase processing time.
    
    Returns:
        List of dictionaries, each containing:
            - name (str): Business or place name
            - rating (float): Average user rating (0-5 stars)
            - reviewsCount (int): Total number of reviews
            - address (str): Full street address
            - phone (str): Contact phone number (if available)
            - website (str): Business website URL (if available)
            - categories (str/list): Business categories or types
            - coordinates (dict): Geographic location with 'lat' and 'lng' keys
            - sourceUrl (str): Google Maps URL for the place
            - raw (dict): Complete raw data from Google Places
    
    Example:
        >>> await get_google_places({"city": "Edmonton, Canada", "query": "pizza", "maxResults": 10})
        [{'name': 'Joe\'s Pizza', 'rating': 4.5, 'reviewsCount': 320, 'address': '123 Main St', ...}, ...]
    
    Raises:
        Exception: If APIFY_TOKEN is not set, API request fails, or the crawler times out after 2 minutes.
    
    Note:
        - Requires APIFY_TOKEN environment variable with a valid Apify API token
        - The function uses the 'compass~crawler-google-places' Apify actor
        - Results are based on Google Maps data and may vary by location
        - Processing time depends on the number of results requested (typically 10-60 seconds)
    """
    city = args.get("city")
    query = args.get("query")
    language = args.get("language", "en")
    max_results = args.get("maxResults", 50)
    
    token = os.getenv("APIFY_TOKEN")
    if not token:
        raise Exception("APIFY_TOKEN is not set in environment.")
    
    start_run_url = f"https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token={token}"
    
    input_data = {
        "includeWebResults": False,
        "language": language,
        "locationQuery": city,
        "maxCrawledPlacesPerSearch": min(max(int(max_results), 1), 200),
        "maxImages": 0,
        "maximumLeadsEnrichmentRecords": 0,
        "scrapeContacts": False,
        "scrapeDirectories": False,
        "scrapeImageAuthors": False,
        "scrapePlaceDetailPage": False,
        "scrapeReviewsPersonalData": True,
        "scrapeTableReservationProvider": False,
        "searchStringsArray": [query],
        "skipClosedPlaces": False,
    }
    
    async with httpx.AsyncClient() as client:
        # 1) Start run
        start_res = await client.post(
            start_run_url,
            json=input_data,
            headers={"Content-Type": "application/json"},
        )
        if start_res.status_code != 201:
            raise Exception(f"Failed to start Apify run: {start_res.status_code} {start_res.text}")
        
        start_json = start_res.json()
        run_id = start_json.get("data", {}).get("id")
        if not run_id:
            raise Exception("Apify run did not return a run ID.")
        
        # 2) Poll status
        status_url = f"https://api.apify.com/v2/actor-runs/{run_id}"
        max_wait_ms = 120000
        poll_interval_ms = 2000
        start_time = asyncio.get_event_loop().time()
        
        while True:
            res = await client.get(status_url)
            if res.status_code != 200:
                raise Exception(f"Failed to check Apify run: {res.status_code} {res.text}")
            
            json_data = res.json()
            run = json_data.get("data")
            if not run or not run.get("status"):
                raise Exception("Apify run status missing.")
            
            if run["status"] in ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]:
                break
            
            elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
            if elapsed > max_wait_ms:
                raise Exception("Apify run timed out.")
            
            await asyncio.sleep(poll_interval_ms / 1000)
        
        if run["status"] != "SUCCEEDED":
            raise Exception(f"Apify run ended with status: {run['status']}")
        
        # 3) Fetch results
        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            raise Exception("No datasetId on Apify run result.")
        
        items_res = await client.get(
            f"https://api.apify.com/v2/datasets/{dataset_id}/items?clean=true"
        )
        if items_res.status_code != 200:
            raise Exception(f"Failed to fetch Apify dataset items: {items_res.status_code} {items_res.text}")
        
        items = items_res.json()
    
    mapped = []
    for p in (items if isinstance(items, list) else []):
        mapped.append({
            "name": p.get("title") or p.get("name"),
            "rating": p.get("rating") or p.get("userRating"),
            "reviewsCount": p.get("reviewsCount") or p.get("reviewCount"),
            "address": p.get("address") or p.get("formattedAddress"),
            "phone": p.get("phone") or p.get("phoneNumber"),
            "website": p.get("website") or p.get("url"),
            "categories": p.get("category") or p.get("types"),
            "coordinates": p.get("location") or (
                {"lat": p["coords"]["lat"], "lng": p["coords"]["lng"]}
                if p.get("coords") else None
            ),
            "sourceUrl": p.get("googleMapsUrl") or p.get("url"),
            "raw": p,
        })
    
    return mapped


async def convert_units(args: Dict[str, Any]) -> Dict[str, Any]:
    """Convert between common units of measurement for temperature and distance.
    
    This function performs unit conversions for temperature (Celsius/Fahrenheit) and distance (kilometers/miles).
    It's useful for quick conversions without needing external APIs or complex calculations.
    
    Args:
        args: Dictionary containing:
            - kind (str, required): The type of conversion to perform. Must be one of:
                * "c_to_f" - Convert Celsius to Fahrenheit
                * "f_to_c" - Convert Fahrenheit to Celsius  
                * "km_to_miles" - Convert kilometers to miles
            - value (number, required): The numeric value to convert. Can be int or float.
    
    Returns:
        Dictionary containing:
            - input (float): The original input value
            - output (float): The converted value
            - unit (str): The unit of the output ("F", "C", or "mi")
        
        Returns error dict if invalid: {"error": "error message"}
    
    Examples:
        >>> await convert_units({"kind": "c_to_f", "value": 25})
        {'input': 25, 'output': 77.0, 'unit': 'F'}
        
        >>> await convert_units({"kind": "km_to_miles", "value": 100})
        {'input': 100, 'output': 62.1371, 'unit': 'mi'}
        
        >>> await convert_units({"kind": "f_to_c", "value": 32})
        {'input': 32, 'output': 0.0, 'unit': 'C'}
    
    Note:
        - Temperature conversions use standard formulas: F = C × 9/5 + 32 and C = (F - 32) × 5/9
        - Distance conversion uses: 1 km = 0.621371 miles
        - All calculations are performed locally without external API calls
    """
    kind = args.get("kind", "").lower()
    value = args.get("value")
    
    try:
        v = float(value)
    except (TypeError, ValueError):
        return {"error": "value must be a number"}
    
    if kind == "c_to_f":
        return {"input": v, "output": v * 9 / 5 + 32, "unit": "F"}
    elif kind == "f_to_c":
        return {"input": v, "output": (v - 32) * 5 / 9, "unit": "C"}
    elif kind == "km_to_miles":
        return {"input": v, "output": v * 0.621371, "unit": "mi"}
    else:
        return {"error": f"unknown kind: {kind}"}


async def get_time(args: Dict[str, Any]) -> Dict[str, str]:
    """Get the current server time in standardized ISO 8601 format.
    
    This function returns the current UTC (Coordinated Universal Time) timestamp from the server.
    It's useful for time-related queries, logging, scheduling, or when you need to know the exact
    current time in a standardized format that works across all timezones.
    
    Args:
        args: Dictionary (no parameters required, can be empty)
    
    Returns:
        Dictionary containing:
            - now (str): Current UTC time in ISO 8601 format with 'Z' timezone indicator
              (e.g., "2025-11-28T14:30:45.123456Z")
    
    Example:
        >>> await get_time({})
        {'now': '2025-11-28T14:30:45.123456Z'}
    
    Note:
        - Time is always returned in UTC (not local server timezone)
        - Format follows ISO 8601 standard: YYYY-MM-DDTHH:MM:SS.ffffffZ
        - Includes microseconds for precision
        - The 'Z' suffix indicates UTC/Zulu time (equivalent to +00:00 offset)
        - This is server time, not necessarily the user's local time
    """
    from datetime import datetime
    return {"now": datetime.utcnow().isoformat() + "Z"}
