const chatBox = document.querySelector(".chat");
const form = document.querySelector("form");
const input = document.querySelector("input");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = input.value.trim();
  if (!userText) return;

  // Show user message
  const userMsg = document.createElement("div");
  userMsg.className = "user";
  userMsg.textContent = userText;
  chatBox.appendChild(userMsg);

  // Show temporary "thinking" message
  const botMsg = document.createElement("div");
  botMsg.className = "bot";
  botMsg.textContent = "Thinking...";
  chatBox.appendChild(botMsg);

  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });

    const data = await response.json();
    botMsg.textContent = data.reply || "⚠️ No response received.";
  } catch (err) {
    botMsg.textContent = "❌ Server error. Try again later.";
    console.error(err);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
});
