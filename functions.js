import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// ===== Existing news function =====
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
    source: a.source?.name,
    url: a.url,
    publishedAt: a.publishedAt,
  }));
}

// ===== New: Google Places via Apify =====
export async function get_google_places({
  city,
  query,
  language = "en",
  maxResults = 50,
}) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN is not set in environment.");
  }

  const startRunUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${encodeURIComponent(
    token
  )}`;

  // Build input per your example schema
  const input = {
    includeWebResults: false,
    language,
    locationQuery: city,
    maxCrawledPlacesPerSearch: Math.min(Math.max(parseInt(maxResults, 10) || 50, 1), 200),
    maxImages: 0,
    maximumLeadsEnrichmentRecords: 0,
    scrapeContacts: false,
    scrapeDirectories: false,
    scrapeImageAuthors: false,
    scrapePlaceDetailPage: false,
    scrapeReviewsPersonalData: true,
    scrapeTableReservationProvider: false,
    searchStringsArray: [query],
    skipClosedPlaces: false,
  };

  // 1) Start the Actor run
  const startRes = await fetch(startRunUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Failed to start Apify run: ${startRes.status} ${text}`);
  }
  const startJson = await startRes.json();
  const runId = startJson?.data?.id;
  if (!runId) throw new Error("Apify run did not return a run ID.");

  // 2) Poll run status until finished
  const runStatusUrl = `https://api.apify.com/v2/actor-runs/${runId}`;
  const maxWaitMs = 120000; // 120s cap
  const pollIntervalMs = 2000;
  const startTime = Date.now();
  let run;

  while (true) {
    const res = await fetch(runStatusUrl);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Failed to check Apify run: ${res.status} ${t}`);
    }
    const json = await res.json();
    run = json?.data;

    if (!run?.status) throw new Error("Apify run status missing.");

    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) break;

    if (Date.now() - startTime > maxWaitMs) {
      throw new Error("Apify run timed out while waiting for completion.");
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run ended with status: ${run.status}`);
  }

  // 3) Fetch dataset items from the run
  const datasetId = run.defaultDatasetId;
  if (!datasetId) throw new Error("No datasetId on Apify run result.");

  const itemsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`;
  const itemsRes = await fetch(itemsUrl);
  if (!itemsRes.ok) {
    const t = await itemsRes.text();
    throw new Error(`Failed to fetch Apify dataset items: ${itemsRes.status} ${t}`);
  }
  const items = await itemsRes.json();

  // Optional: map to key fields if present; otherwise return raw items
  const mapped = (Array.isArray(items) ? items : []).map((p) => ({
    name: p.title || p.name || null,
    rating: p.rating || p.userRating || null,
    reviewsCount: p.reviewsCount || p.reviewCount || null,
    address: p.address || p.formattedAddress || null,
    phone: p.phone || p.phoneNumber || null,
    website: p.website || p.url || null,
    categories: p.category || p.types || null,
    coordinates: p.location || (p.coords ? { lat: p.coords.lat, lng: p.coords.lng } : null),
    sourceUrl: p.googleMapsUrl || p.url || null,
    raw: p, // keep full record for maximum fidelity
  }));

  return mapped;
}
