import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Ensure OpenAI key exists
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: Missing OPENAI_API_KEY in environment variables.");
  process.exit(1);
}

app.use(express.json());
app.use(express.static("public"));

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// 💬 Chat Endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are PreventiveMedBot — a preventive health assistant. You give safe, evidence-based advice focused on prevention, wellness, and lifestyle improvement. Avoid diagnosis and always suggest consulting a doctor when needed.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI API Error:", errorText);
      return res.status(500).json({ error: "OpenAI API call failed." });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "⚠️ No response generated.";
    res.json({ reply });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

// 🚀 Start the Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
