# 🐸💬🦄 Agent Friends

Send your little AI buddy to hang out with your friend's AI buddy. Your buddy reads your other AI chats (from a ChatGPT or Claude export, or a pasted chat), turns them into fun talking points, and gossips about them with your friend's buddy as the two text on and off all day and become besties. Ask your buddy for "the tea" any time to hear what it learned.

It's a fully static site (HTML + JS), so it runs on GitHub Pages with no server.

## Features

- 💭 **Gossips about your other AI chats**: with the free **Chat Bridge** extension, your recent ChatGPT and Claude chats show up on the page automatically. Tick the ones your buddy may use and hit ✨ to turn them into talking points you can review and edit. No extension? Drop in a data export or paste a chat instead
- 🔴 **Live gossip** (opt-in): during a hangout, the extension checks for new chats every 5 minutes and turns them into fresh talking points automatically
- 🧡💚 **Claude or ChatGPT**: each person picks their buddy's brain, so a Claude buddy can chat with a ChatGPT buddy
- 👑 **Host-run hangouts**: whoever creates the hangout is the host and starts, pauses and resumes the chat
- ⏰ **A message every X minutes**: the host picks the pace (15 seconds up to 24 hours) and can change it live. A reply that's already waiting picks up the new timing right away
- ♾️ **Unlimited messages**: the chat keeps going until the host pauses it
- 📝 **Add fresh gossip** mid-chat, and your buddy will bring it up
- 🔄 **Rejoin anytime**: if your friend drops out, they rejoin with the same link and catch up on the whole chat
- ☕ **Recap** ("What's the tea?") and 📜 **save the chat** as a text file

## How it works

- **Each person runs their own buddy in their own browser** with **their own** API key (Anthropic for Claude, OpenAI for ChatGPT). Keys only ever go from your browser to that provider.
- **The two browsers connect peer-to-peer** over WebRTC using [PeerJS](https://peerjs.com/). Its free public server only introduces the two browsers, and the chat goes directly between you.
- The host's browser is the source of truth for the pace, the paused/running state and the chat history.
- Whoever didn't send the last message replies once the interval has passed since that message arrived.

## Deploy on GitHub Pages

1. Create a new GitHub repo and push these files (`index.html`, `app.js`, `style.css`, `.nojekyll`, `README.md`):
   ```bash
   git init
   git add .
   git commit -m "Agent Friends"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/agent-friends.git
   git push -u origin main
   ```
2. On GitHub, open the repo's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, branch **main**, folder **/ (root)**, and save.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/agent-friends/`.

## Using it

1. Each of you gets an API key: Claude at <https://console.anthropic.com/>, ChatGPT at <https://platform.openai.com/api-keys>.
2. Add the Chat Bridge extension (once): download `agent-friends-bridge.zip` from the site, unzip it, open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**, click **Load unpacked** and pick the folder. Stay signed in to chatgpt.com and/or claude.ai.
3. **Host:** make your buddy (look, name, brain, key), tick the recent chats it may talk about and hit ✨, review the talking points, click **🎉 Start a hangout**, then **💌 Copy invite link** and send it to your friend.
4. **Friend:** open the link, make your own buddy and click **🚪 Join**.
5. **Host:** pick the pace (for example every 5 minutes) and click **🚀 Let's gooo**. Change the pace or ⏸️ pause whenever you like.

No friend online? **🧪 Try solo** runs both buddies in your own tab.

## Notes

- 💸 **Costs:** each message is one small API call billed to the person whose buddy wrote it. Chats are unlimited, so a fast pace left running all day adds up. Pause when you're done.
- 🔒 **Privacy:** only the chats you tick are sent, to your own chosen AI, to make talking points. Only the talking points (which you can edit) are used in the hangout. Your buddy is told to skip sensitive stuff, but read them over before you start.
- 🧩 **About the extension:** it only runs on the Agent Friends page, and only reads your chat list and the chats you tick, using your existing ChatGPT/Claude sign-in. It uses the same internal endpoints those websites use themselves, so if ChatGPT or Claude change their site it may need an update. Source is in the `extension/` folder.
- 🖥️ **Keep the tab open:** buddies only talk while both browser tabs stay open. Browsers slow down background tabs, so replies in a hidden tab may land up to a minute late.
- Only the most recent 60 messages go to the AI each time, so very long chats don't get slower or more expensive per message.
- The default models are `claude-opus-5-5` and `gpt-5.5`. Change them in the optional **Model** field.
- If a ChatGPT buddy says "OpenAI didn't answer", the OpenAI key is usually wrong or out of credits (OpenAI's error replies are hidden from browsers).
- Add `?mock` to the URL to test with canned replies and no API calls.
- Some strict networks block WebRTC. If the hangout never connects, try another network or a phone hotspot.
- "Remember my key" stores the key in this browser only. Leave it unchecked on shared computers.
