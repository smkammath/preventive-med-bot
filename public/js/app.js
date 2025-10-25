// public/js/app.js - simple frontend for chat + image handling
const form = document.getElementById("chatForm");
const input = document.getElementById("userInput");
const messages = document.getElementById("messages");

function appendMsg(text, cls = "bot") {
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = text.replaceAll("\n", "<br>");
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function appendImage(url) {
  const wrap = document.createElement("div");
  wrap.className = "image-grid";
  const img = document.createElement("img");
  img.src = url;
  wrap.appendChild(img);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMsg(text, "user");
  const thinking = appendMsg("Thinking...", "bot");
  input.value = "";
  try {
    const resp = await fetch(`${window.location.origin}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: text })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(()=>({ error: "Server error" }));
      thinking.innerHTML = `⚠️ ${err?.error || "Server error"}`;
      return;
    }

    const data = await resp.json();

    if (data.emergency) {
      thinking.innerHTML = `<strong>${data.message.summary}</strong><br>${data.message.action}`;
      return;
    }

    if (data.assistantText) {
      thinking.innerHTML = data.assistantText;
    } else {
      thinking.innerHTML = "⚠️ No reply from AI.";
    }

  } catch (err) {
    thinking.innerHTML = "❌ Connection error. Try again later.";
    console.error(err);
  }
});

// (Optional) Example: image generation call — use in future UI control
async function genImage(prompt) {
  try {
    const resp = await fetch(`${window.location.origin}/api/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, n: 1 })
    });
    const data = await resp.json();
    if (data?.images?.[0]?.b64_json) {
      const b64 = data.images[0].b64_json;
      appendImage("data:image/png;base64," + b64);
    } else if (data?.images?.[0]?.url) {
      appendImage(data.images[0].url);
    } else {
      appendMsg("⚠️ No image returned.", "bot");
    }
  } catch (e) {
    appendMsg("❌ Image generation failed.", "bot");
  }
}
