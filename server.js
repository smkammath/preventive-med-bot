import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

// Polyfill fetch if needed
if (!globalThis.fetch) {
  globalThis.fetch = (await import("node-fetch")).default;
}

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || "gpt-4o-mini";

function cleanAIResponse(text) {
  if (!text) return "I'm sorry, I couldn’t generate a response right now.";
  return text
    .replace(/```json|```/g, "")
    .replace(/[{}"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "No message provided." });
  }

  try {
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are PreventiveMedBot, a friendly AI that offers health and wellness guidance without diagnosing. Encourage balanced habits, mindfulness, and preventive actions.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    console.log("🔍 OpenAI Raw Response:", data);

    if (!response.ok) {
      console.error("❌ OpenAI API Error:", data.error);
      throw new Error(data.error?.message || "Failed to fetch OpenAI response");
    }

    const aiMessage = data.choices?.[0]?.message?.content || "No response received from OpenAI.";
    res.json({ reply: cleanAIResponse(aiMessage) });
  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.listen(PORT, () => console.log(`✅ PreventiveMedBot running on port ${PORT}`));
