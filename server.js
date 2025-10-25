require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'dalle-3';

if (!OPENAI_KEY) {
  console.error('Missing OPENAI_API_KEY in environment');
  process.exit(1);
}

const systemPrompt = fs.readFileSync(path.join(__dirname, 'openai-system-prompt.txt'), 'utf8');
const sessions = {};

function getSessionMessages(id) {
  if (!sessions[id]) sessions[id] = [{ role: 'system', content: systemPrompt }];
  return sessions[id];
}

async function callOpenAI(messages) {
  const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: MODEL,
    messages,
    temperature: 0.0
  }, { headers: { Authorization: `Bearer ${OPENAI_KEY}` } });
  return resp.data;
}

app.post('/api/chat', async (req, res) => {
  const { sessionId = 'default', userMessage } = req.body;
  if (!userMessage) return res.status(400).json({ error: 'Missing message' });

  const messages = getSessionMessages(sessionId);
  messages.push({ role: 'user', content: userMessage });

  const lower = userMessage.toLowerCase();
  const redFlags = ['chest pain', 'shortness of breath', 'severe bleeding', 'loss of consciousness', 'suicidal'];
  if (redFlags.some(r => lower.includes(r))) {
    const emergency = {
      summary: 'Possible emergency detected.',
      action: 'Please seek emergency medical care immediately.',
      sources: ['WHO emergency triage guidelines'],
      confidence: 'High',
      follow_up: []
    };
    messages.push({ role: 'assistant', content: JSON.stringify(emergency) });
    return res.json({ ok: true, emergency: true, message: emergency });
  }

  try {
    const ai = await callOpenAI(messages);
    const msg = ai.choices[0].message.content;
    messages.push({ role: 'assistant', content: msg });
    res.json({ ok: true, message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const resp = await axios.post('https://api.openai.com/v1/images/generations', {
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024'
    }, { headers: { Authorization: `Bearer ${OPENAI_KEY}` } });
    res.json({ ok: true, images: resp.data.data });
  } catch (e) {
    res.status(500).json({ error: 'Image gen failed', details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
