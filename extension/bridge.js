// Runs only on the Agent Friends page. Relays the page's requests to the extension and the answers back.
// The page can only ask for the list of recent chats and for chats by id; nothing else is exposed.
const VERSION = chrome.runtime.getManifest().version;

function announce() {
  window.postMessage({ source: "af-ext", type: "hello", version: VERSION }, location.origin);
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== "af-page") return;
  if (msg.type === "ping") return announce();
  if (msg.type !== "list" && msg.type !== "get") return;
  let reply;
  try {
    reply = await chrome.runtime.sendMessage({ type: msg.type, providers: msg.providers, limit: msg.limit, items: msg.items });
  } catch (e) {
    reply = { ok: false, error: "The Chat Bridge extension was reloaded. Refresh this page." };
  }
  window.postMessage({ source: "af-ext", type: msg.type + "-result", id: msg.id, ...reply }, location.origin);
});

announce();
document.addEventListener("DOMContentLoaded", announce);
