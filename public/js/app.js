const form = document.getElementById('chatForm');
const input = document.getElementById('userInput');
const messages = document.getElementById('messages');
const imageBox = document.getElementById('imageBox');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  input.value = '';
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage: text })
  });
  const data = await res.json();
  if (data.message) addMsg(data.message, 'bot');
  if (data.emergency) addMsg(data.message.action, 'bot');
});

function addMsg(t, cls) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.innerHTML = t.replaceAll('\n', '<br>');
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
