import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import { functions } from "./tools.js";
import { get_latest_news } from "./functions.js";

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== Pricing for gpt-4.1 (USD per 1K tokens) =====
// Update these if OpenAI pricing changes.
const MODEL_PRICING = {
  input: 0.005,   // $0.005 / 1K input tokens
  output: 0.015,  // $0.015 / 1K output tokens
};

// Simple timestamped logger
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

// Cost calculator
function costFromUsage(usage) {
  if (!usage) return 0;
  const inCost = (usage.prompt_tokens || 0) / 1000 * MODEL_PRICING.input;
  const outCost = (usage.completion_tokens || 0) / 1000 * MODEL_PRICING.output;
  return inCost + outCost;
}

app.post("/news", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    log("❌ Missing 'query' in request body");
    return res.status(400).json({ error: "Missing 'query' in request body." });
  }

  log("📩 Received request", { query });

  // Per-request aggregates
  let totalTokens = 0;
  let totalCost = 0;

  try {
    // Step 1: Ask OpenAI to interpret user intent
    log("🧠 Calling OpenAI to interpret query...");
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: query }],
      functions,
      function_call: "auto",
    });

    // Usage + cost logging for first call
    const usage1 = aiResponse.usage || {};
    const cost1 = costFromUsage(usage1);
    totalTokens += usage1.total_tokens || 0;
    totalCost += cost1;
    log("📊 OpenAI usage (intent)", {
      prompt_tokens: usage1.prompt_tokens,
      completion_tokens: usage1.completion_tokens,
      total_tokens: usage1.total_tokens,
      cost_usd: `$${cost1.toFixed(6)}`
    });

    const message = aiResponse.choices[0].message;
    log("✅ OpenAI response received", { function_call: message.function_call });

    // Step 2: If OpenAI requested a function call
    if (message.function_call) {
      const { name, arguments: args } = message.function_call;
      const parsedArgs = JSON.parse(args);
      log(`⚙️ Function call triggered: ${name}`, parsedArgs);

      let result;
      if (name === "get_latest_news") {
        log("🌍 Fetching from News API...");
        result = await get_latest_news(parsedArgs);
        log("✅ News API fetch successful", { articles: result.length || 0 });
      } else {
        throw new Error(`Unknown function: ${name}`);
      }

      // Step 3: Summarize with OpenAI
      log("🧩 Sending results back to OpenAI for summarization...");
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "user", content: query },
          message,
          { role: "function", name, content: JSON.stringify(result) },
        ],
      });

      // Usage + cost logging for second call
      const usage2 = summaryResponse.usage || {};
      const cost2 = costFromUsage(usage2);
      totalTokens += usage2.total_tokens || 0;
      totalCost += cost2;
      log("📊 OpenAI usage (summary)", {
        prompt_tokens: usage2.prompt_tokens,
        completion_tokens: usage2.completion_tokens,
        total_tokens: usage2.total_tokens,
        cost_usd: `$${cost2.toFixed(6)}`
      });

      const summary = summaryResponse.choices[0].message.content;
      log("✅ OpenAI summarization complete");
      log("🧾 Request totals", {
        total_tokens: totalTokens,
        total_cost_usd: `$${totalCost.toFixed(6)}`
      });

      return res.json({
        topic: parsedArgs.topic,
        result,
        summary,
        tokens_used: totalTokens,
        estimated_cost_usd: Number(totalCost.toFixed(6)),
      });
    }

    // Step 4: No function call — just return OpenAI content
    log("ℹ️ No function call made by OpenAI");
    log("🧾 Request totals", {
      total_tokens: totalTokens,
      total_cost_usd: `$${totalCost.toFixed(6)}`
    });

    res.json({
      response: message.content,
      tokens_used: totalTokens,
      estimated_cost_usd: Number(totalCost.toFixed(6)),
    });
  } catch (err) {
    log("❌ Error during request", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`🚀 Server running on port ${PORT}`));
