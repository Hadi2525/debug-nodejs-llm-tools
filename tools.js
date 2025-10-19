export const functions = [
  {
    name: "get_latest_news",
    description: "Fetches the latest news headlines based on a topic.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic to search for in the news.",
        },
        language: {
          type: "string",
          description: "Language code, e.g. 'en', 'fr'.",
          default: "en",
        },
      },
      required: ["topic"],
    },
  },
];
