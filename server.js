// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || "gpt-4o-mini";

// 🧠 Helper: Format raw text cleanly
function cleanAIResponse(text) {
  if (!text) return "I'm sorry, I couldn't generate a response right now.";
  // Remove JSON code block syntax if present
  return text
    .replace(/```json|```/g, "")
    .replace(/["{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 🩺 POST route to handle chat requests
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "No message provided." });
  }

  try {
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
              "You are PreventiveMedBot, an AI specializing in preventive healthcare. " +
              "Provide concise, empathetic, and helpful advice about health habits, lifestyle improvements, and symptom awareness. " +
              "Never diagnose — always emphasize consulting healthcare professionals if symptoms persist.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch from OpenAI API");
    }

    const aiMessage = data.choices?.[0]?.message?.content || "";
    const cleanedResponse = cleanAIResponse(aiMessage);

    res.json({ reply: cleanedResponse });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      error: "Error generating response from OpenAI",
      details: error.message,
    });
  }
});

// 🩵 Default route
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
