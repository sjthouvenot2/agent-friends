// Reads your own recent chats from chatgpt.com and claude.ai using the session you're already signed in with.
// These are the sites' internal web endpoints (the same ones their own pages use), so they can change without notice.

const SITES = {
  chatgpt: { origin: "https://chatgpt.com", label: "ChatGPT" },
  claude: { origin: "https://claude.ai", label: "Claude" },
};

// Prefer making the request from an open, signed-in tab of the site (most reliable), else fetch directly.
async function siteFetch(site, path, headers = {}) {
  const url = SITES[site].origin + path;
  const tabs = await chrome.tabs.query({ url: SITES[site].origin + "/*" }).catch(() => []);
  for (const tab of tabs) {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (u, h) => {
          const r = await fetch(u, { headers: h, credentials: "include" });
          return { status: r.status, text: await r.text() };
        },
        args: [url, headers],
      });
      if (res?.result) return parse(res.result, site);
    } catch {
      // tab may be discarded or still loading; try the next one or fall back
    }
  }
  const r = await fetch(url, { headers, credentials: "include" });
  return parse({ status: r.status, text: await r.text() }, site);
}

function parse({ status, text }, site) {
  const label = SITES[site].label;
  if (status === 401 || status === 403) throw new Error(`Not signed in to ${label}. Open ${SITES[site].origin} in a tab and sign in, then hit refresh.`);
  if (status >= 400) throw new Error(`${label} said ${status}. Open ${SITES[site].origin} in a tab, then hit refresh.`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} sent back a web page instead of data. Open ${SITES[site].origin} in a tab (finish any "are you human" check), then hit refresh.`);
  }
}

const toMs = (t) => (typeof t === "number" ? (t < 1e12 ? t * 1000 : t) : Date.parse(t) || 0);

// ---------- ChatGPT ----------
async function chatgptAuth() {
  const session = await siteFetch("chatgpt", "/api/auth/session");
  if (!session?.accessToken) throw new Error("Not signed in to ChatGPT. Open chatgpt.com in a tab and sign in, then hit refresh.");
  return { Authorization: "Bearer " + session.accessToken };
}

async function chatgptList(limit) {
  const headers = await chatgptAuth();
  const data = await siteFetch("chatgpt", `/backend-api/conversations?offset=0&limit=${limit}&order=updated`, headers);
  return (data.items || []).map((c) => ({
    provider: "chatgpt",
    id: c.id,
    title: c.title || "Untitled chat",
    updated: toMs(c.update_time || c.create_time),
  }));
}

async function chatgptGet(ids) {
  const headers = await chatgptAuth();
  const out = {};
  for (const id of ids) {
    const c = await siteFetch("chatgpt", `/backend-api/conversation/${encodeURIComponent(id)}`, headers);
    out[id] = Object.values(c.mapping || {})
      .map((n) => n?.message)
      .filter((m) => m && (m.author?.role === "user" || m.author?.role === "assistant"))
      .sort((a, b) => (a.create_time || 0) - (b.create_time || 0))
      .map((m) => ({
        role: m.author.role,
        text: (m.content?.parts || []).map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n"),
      }))
      .filter((m) => m.text.trim());
  }
  return out;
}

// ---------- Claude ----------
let claudeOrg = null;
async function claudeOrgId() {
  if (claudeOrg) return claudeOrg;
  const orgs = await siteFetch("claude", "/api/organizations");
  if (!Array.isArray(orgs) || !orgs.length) throw new Error("Not signed in to Claude. Open claude.ai in a tab and sign in, then hit refresh.");
  const chatOrg = orgs.find((o) => (o.capabilities || []).includes("chat")) || orgs[0];
  claudeOrg = chatOrg.uuid;
  return claudeOrg;
}

async function claudeList(limit) {
  const org = await claudeOrgId();
  const list = await siteFetch("claude", `/api/organizations/${org}/chat_conversations?limit=${limit}`);
  return (Array.isArray(list) ? list : list?.data || [])
    .map((c) => ({ provider: "claude", id: c.uuid, title: c.name || "Untitled chat", updated: toMs(c.updated_at || c.created_at) }))
    .sort((a, b) => b.updated - a.updated)
    .slice(0, limit);
}

async function claudeGet(ids) {
  const org = await claudeOrgId();
  const out = {};
  for (const id of ids) {
    const c = await siteFetch("claude", `/api/organizations/${org}/chat_conversations/${encodeURIComponent(id)}?tree=True&rendering_mode=messages`);
    out[id] = (c.chat_messages || [])
      .map((m) => ({
        role: m.sender === "human" ? "user" : "assistant",
        text: m.text || (m.content || []).filter((b) => b?.type === "text").map((b) => b.text).join("\n"),
      }))
      .filter((m) => m.text && m.text.trim());
  }
  return out;
}

// ---------- message handling ----------
async function handle(msg) {
  const providers = (msg.providers || ["chatgpt", "claude"]).filter((p) => SITES[p]);
  if (msg.type === "list") {
    const limit = Math.min(Math.max(Number(msg.limit) || 25, 1), 60);
    const convos = [], errors = {};
    await Promise.all(providers.map(async (p) => {
      try { convos.push(...(p === "chatgpt" ? await chatgptList(limit) : await claudeList(limit))); }
      catch (e) { errors[p] = e.message; }
    }));
    convos.sort((a, b) => b.updated - a.updated);
    return { ok: true, convos, errors };
  }
  if (msg.type === "get") {
    const items = (msg.items || []).slice(0, 20);
    const messages = {}, errors = {};
    for (const p of providers) {
      const ids = items.filter((i) => i.provider === p).map((i) => String(i.id));
      if (!ids.length) continue;
      try { Object.assign(messages, p === "chatgpt" ? await chatgptGet(ids) : await claudeGet(ids)); }
      catch (e) { errors[p] = e.message; }
    }
    return { ok: true, messages, errors };
  }
  return { ok: false, error: "Unknown request" };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only answer our own content script running on the Agent Friends page.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith("https://sjthouvenot2.github.io/agent-friends/")) return false;
  handle(msg).then(sendResponse, (e) => sendResponse({ ok: false, error: e.message }));
  return true;
});
