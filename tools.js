export const functions = [
  {
    name: "get_latest_news",
    description: "Fetches the latest news headlines based on a topic.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic to search for in the news." },
        language: { type: "string", description: "Language code (e.g., 'en','fr').", default: "en" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_google_places",
    description: "Finds recommended places (e.g., restaurants) in a given city using Apify Google Places scraper.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City or area to search, e.g. 'New York, USA'." },
        query: { type: "string", description: "Place type or keyword, e.g. 'restaurant', 'coffee', 'museum'." },
        language: { type: "string", description: "Language of results, e.g. 'en'.", default: "en" },
        maxResults: { type: "integer", description: "Max places to crawl per search (1-200).", default: 50 }
      },
      required: ["city", "query"]
    }
  }
];
