// server.js — PreventiveMedBot (robust production-ready version)
import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Use built-in fetch (Node 18+)
const fetchFn = global.fetch;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Load system prompt if present
import { readFileSync, existsSync } from "fs";
let systemPrompt = "You are PreventiveMedBot — a preventive medicine assistant that provides safe, evidence-based lifestyle and wellness advice. Avoid diagnosis; encourage professional care when needed.";
const promptFile = path.join(process.cwd(), "openai-system-prompt.txt");
if (existsSync(promptFile)) {
  try {
    systemPrompt = readFileSync(promptFile, "utf8");
  } catch (e) {
    console.warn("Warning: could not read openai-system-prompt.txt; using default prompt.");
  }
}

// Helper: check API key on demand (so server doesn't crash if missing)
function getApiKey() {
  return process.env.OPENAI_API_KEY || null;
}

// Emergency/simple red-flag detection (quick check before calling API)
function detectEmergency(userText) {
  if (!userText) return false;
  const lowered = userText.toLowerCase();
  const flags = [
    "chest pain",
    "shortness of breath",
    "severe bleeding",
    "loss of consciousness",
    "suicidal",
    "suicide",
    "stroke",
    "unable to breathe",
    "difficulty breathing"
  ];
  return flags.some((f) => lowered.includes(f));
}

// --- Chat endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: "Service temporarily unavailable: missing API key (admin)."
      });
    }

    const userMessage = req.body?.userMessage || req.body?.message || "";
    if (!userMessage) {
      return res.status(400).json({ error: "Missing userMessage in request body." });
    }

    // Quick emergency detection
    if (detectEmergency(userMessage)) {
      const emergency = {
        summary: "🚨 Possible medical emergency detected.",
        action: "If you or someone is experiencing this now, please call emergency services immediately.",
        follow_up: "If stable, describe symptoms, duration, and severity for triage guidance."
      };
      return res.json({ ok: true, emergency: true, message: emergency });
    }

    // Build messages array (system + user)
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    // Call OpenAI Chat Completions
    const model = process.env.MODEL || "gpt-4o-mini"; // default
    const openaiUrl = "https://api.openai.com/v1/chat/completions";

    const resp = await fetchFn(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.0,
        max_tokens: 800
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OpenAI API error:", resp.status, errText);
      return res.status(502).json({ error: "OpenAI API call failed", details: errText });
    }

    const json = await resp.json();
    const assistantText = json.choices?.[0]?.message?.content ?? null;
    if (!assistantText) {
      return res.status(500).json({ error: "No assistant response returned from OpenAI." });
    }

    return res.json({ ok: true, assistantText });
  } catch (err) {
    console.error("Server error in /api/chat:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// --- Image generation endpoint ---
app.post("/api/image", async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: "Service temporarily unavailable: missing API key (admin)." });
    }

    const prompt = req.body?.prompt;
    if (!prompt) return res.status(400).json({ error: "Missing prompt in request body." });

    const model = process.env.IMAGE_MODEL || "gpt-image-1";
    const url = "https://api.openai.com/v1/images/generations";

    const resp = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt,
        n: req.body.n || 1,
        size: req.body.size || "1024x1024"
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OpenAI image API error:", resp.status, errText);
      return res.status(502).json({ error: "OpenAI image API call failed", details: errText });
    }

    const json = await resp.json();
    // OpenAI images endpoint can return data[].url or data[].b64_json depending on response — send raw to client
    return res.json({ ok: true, images: json.data });
  } catch (err) {
    console.error("Server error in /api/image:", err);
    return res.status(500).json({ error: "Internal server error (image)." });
  }
});

// Serve index.html for root and fallback (SPA friendly)
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
