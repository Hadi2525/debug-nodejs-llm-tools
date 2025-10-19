import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function get_latest_news({ topic, language = "en" }) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    topic
  )}&language=${language}&pageSize=5&sortBy=publishedAt&apiKey=${
    process.env.NEWS_API_KEY
  }`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.articles) {
    return { error: "No articles found or invalid response." };
  }

  return data.articles.map((a) => ({
    title: a.title,
    source: a.source.name,
    url: a.url,
    publishedAt: a.publishedAt,
  }));
}
