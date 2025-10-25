// server.js — Preventive-Med-Bot (Final version)
// ✅ Fixed: Root route now correctly serves index.html on Render
// ✅ Works with static files and OpenAI API

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve the static frontend files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Environment Variables ---
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'dalle-3';

if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment');
  process.exit(1);
}

// --- Load system prompt ---
const systemPrompt = fs.readFileSync(path.join(__dirname, 'openai-system-prompt.txt'), 'utf8');

// --- In-memory session store (no DB needed) ---
const sessions = {};

function getSessionMessages(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = [{ role: 'system', content: systemPrompt }];
  }
  return sessions[sessionId];
}

// --- Helper to call OpenAI Chat API ---
async function callOpenAI(messages) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: MODEL,
    messages,
    temperature: 0.0,
    max_tokens: 800
  };
  const resp = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}` }
  });
  return resp.data;
}

// --- Chat Endpoint ---
app.post('/api/chat', async (req, res) => {
  const { sessionId = 'default', userMessage } = req.body;
  if (!userMessage) return res.status(400).json({ error: 'Missing userMessage' });

  const messages = getSessionMessages(sessionId);
  messages.push({ role: 'user', content: userMessage });

  // ✅ Red-flag emergency keyword detection
  const lower = userMessage.toLowerCase();
  const redFlags = [
    'chest pain',
    'shortness of breath',
    'severe bleeding',
    'loss of consciousness',
    'suicidal'
  ];
  if (redFlags.some(flag => lower.includes(flag))) {
    const emergency = {
      summary: '🚨 Possible medical emergency detected.',
      action: 'Please seek immediate emergency medical care (call your local emergency number).',
      sources: ['WHO emergency triage guidelines'],
      confidence: 'High',
      follow_up: []
    };
    messages.push({ role: 'assistant', content: JSON.stringify(emergency) });
    return res.json({ ok: true, emergency: true, message: emergency });
  }

  try {
    const aiResponse = await callOpenAI(messages);
    const assistantText = aiResponse.choices[0].message.content;
    messages.push({ role: 'assistant', content: assistantText });
    res.json({ ok: true, model: MODEL, assistantText });
  } catch (err) {
    console.error('❌ OpenAI API Error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'OpenAI request failed', details: err.message });
  }
});

// --- Image Generation Endpoint ---
app.post('/api/image', async (req, res) => {
  try {
    const { prompt, n = 1, size = '1024x1024' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const url = 'https://api.openai.com/v1/images/generations';
    const resp = await axios.post(
      url,
      { model: IMAGE_MODEL, prompt, n, size },
      { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
    );

    res.json({ ok: true, images: resp.data.data });
  } catch (e) {
    console.error('❌ Image generation failed:', e?.response?.data || e.message);
    res.status(500).json({ error: 'Image generation failed', details: e.message });
  }
});

// ✅ Fallback route — serves index.html for any unknown path
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
