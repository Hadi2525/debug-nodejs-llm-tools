// server.js
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

import {
  registerTool,
  dispatch,
  listToolsForOpenAI,
  listToolsForGemini,
} from "./tools.js";

import {
  get_latest_news,
  get_google_places,
  convert_units,
  get_time,
} from "./functions.js";

dotenv.config();

const app = express();
app.use(express.json());

// -----------------------
// Register your tools
// -----------------------
registerTool(
  {
    name: "get_latest_news",
    description: "Fetch latest news headlines on a topic.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic to search for." },
        language: { type: "string", description: "Language code, e.g., 'en'." },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  get_latest_news
);

registerTool(
  {
    name: "get_google_places",
    description: "Find recommended places (e.g., restaurants) in a city using Apify Google Places.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City or area, e.g., 'Calgary, Canada'." },
        query: { type: "string", description: "Place type/keyword, e.g., 'coffee'." },
        language: { type: "string", description: "Language of results." },
        maxResults: { type: "integer", description: "1–200" },
      },
      required: ["city", "query"],
      additionalProperties: false,
    },
  },
  get_google_places
);

// New simple demos
registerTool(
  {
    name: "convert_units",
    description: "Convert units: c_to_f, f_to_c, km_to_miles.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["c_to_f", "f_to_c", "km_to_miles"] },
        value: { type: "number" },
      },
      required: ["kind", "value"],
      additionalProperties: false,
    },
  },
  convert_units
);

registerTool(
  {
    name: "get_time",
    description: "Return current server time in ISO format.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_time
);

// -----------------------
// Clients
// -----------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Chat Completions with tools :contentReference[oaicite:2]{index=2}
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });   // Gemini function calling :contentReference[oaicite:3]{index=3}

// -----------------------
// Helpers
// -----------------------
const MODEL_PRICING = { input: 0.005, output: 0.015 }; // example pricing (adjust to your model)
const log = (m, d = null) => {
  const t = new Date().toISOString();
  if (d) console.log(`[${t}] ${m}`, d);
  else console.log(`[${t}] ${m}`);
};
const costFromUsage = (u) => {
  if (!u) return 0;
  const inCost = ((u.prompt_tokens || 0) / 1000) * MODEL_PRICING.input;
  const outCost = ((u.completion_tokens || 0) / 1000) * MODEL_PRICING.output;
  return inCost + outCost;
};

// =======================================================
// POST /query  -> OpenAI (Chat Completions) with tools
// =======================================================
app.post("/query", async (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "Missing 'query' in request body." });

  log("📩 /query", { query });
  let totalTokens = 0;
  let totalCost = 0;

  try {
    // Step 1: Ask OpenAI; give it the tool catalog
    const first = await openai.chat.completions.create({
      model: "gpt-4o", // any tool-capable model (your code had gpt-4.1)
      messages: [{ role: "user", content: query }],
      tools: listToolsForOpenAI(),
      tool_choice: "auto",
    });

    const usage1 = first.usage || {};
    totalTokens += usage1.total_tokens || 0;
    totalCost += costFromUsage(usage1);
    const assistantMsg = first.choices[0].message;
    const calls = assistantMsg.tool_calls || [];

    if (calls.length === 0) {
      log("ℹ️ No tool call; returning assistant text");
      return res.json({
        response: assistantMsg.content,
        tokens_used: totalTokens,
        estimated_cost_usd: Number(totalCost.toFixed(6)),
      });
    }

    // Step 2: Execute tool calls (simple serial execution; parallelize if independent)
    const toolResponses = [];
    for (const call of calls) {
      const { name, arguments: argString } = call.function;
      const args = argString ? JSON.parse(argString) : {};
      log(`⚙️ ${name}`, args);

      const result = await dispatch(name, args);
      toolResponses.push({
        role: "tool",
        tool_call_id: call.id,           // critical: link back to tool call
        content: JSON.stringify(result), // string content
        name,
      });
    }

    // Step 3: Ask OpenAI to summarize
    const final = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: query },
        assistantMsg,   // contains tool_calls
        ...toolResponses,
      ],
    });

    const usage2 = final.usage || {};
    totalTokens += usage2.total_tokens || 0;
    totalCost += costFromUsage(usage2);

    return res.json({
      tool_calls: calls.map((c) => ({ name: c.function.name })),
      summary: final.choices[0].message.content,
      tokens_used: totalTokens,
      estimated_cost_usd: Number(totalCost.toFixed(6)),
    });
  } catch (err) {
    log("❌ /query error", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// POST /query-gemini  -> Gemini function calling (multi-turn pattern)
// ==================================================================
app.post("/query-gemini", async (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "Missing 'query' in request body." });

  log("📩 /query-gemini", { query });

  try {
    // Step 1: First turn — model may request function calls
    const first = await genai.models.generateContent({
      model: "gemini-2.5-flash-lite", // pick your preferred Gemini model
      // Provide tools (function declarations) to the model
      tools: listToolsForGemini(), // docs: function calling & tools :contentReference[oaicite:4]{index=4}
      systemInstruction:
        "You are a concise assistant. Use tools when they add factual value. Keep answers tight.",
      contents: query,
    });

    const candidate = first.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts
      .map((p) => p.functionCall)
      .filter(Boolean); // [{ name, args }]

    if (!functionCalls.length) {
      // No tools needed; return model text
      const text = parts.map((p) => p.text).filter(Boolean).join("\n");
      return res.json({ response: text || "(no text)" });
    }

    // Step 2: Execute each function call
    const toolResults = [];
    for (const fc of functionCalls) {
      const { name, args } = fc;
      log(`⚙️ Gemini tool call: ${name}`, args);
      const result = await dispatch(name, args || {});
      // Build a tool response part for Gemini
      toolResults.push({
        functionResponse: { name, response: result },
      });
    }

    // Step 3: Send tool results back, ask for final answer
    const second = await genai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      tools: listToolsForGemini(),
      systemInstruction:
        "You are a concise assistant. Use tools when they add factual value. Keep answers tight.",
      contents: [
        { role: "user", parts: [{ text: query }] },
        candidate.content, // the assistant turn with functionCalls
        { role: "function", parts: toolResults },    // return the results
      ],
    });

    const finalText =
      second.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        ?.filter(Boolean)
        ?.join("\n") || "";

    return res.json({
      gemini_tool_calls: functionCalls.map((c) => ({ name: c.name })),
      summary: finalText,
    });
  } catch (err) {
    log("❌ /query-gemini error", err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`🚀 Server running on port ${PORT}`));
