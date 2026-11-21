# Circall

**No surprises. No awkward asking.**

Circall is a simple webapp for one family or group — a “circle” — to
coordinate everyday life in one place, instead of stitching it together
across lots of apps and messages.

The idea: you ask the **circle**, not one specific person, for help.
Someone posts a need, others claim a part of it, and everyone can see
who is free, where people have checked in, and what the circle is
working toward.

> **Name note:** “Circall” is a provisional working name. A preliminary
> web screen found no exact family/group app called Circall, but it is
> **not** a trademark clearance — no USPTO status check and no domain
> check were done. Do a proper trademark/domain check before any
> app-store listing, domain purchase, or branding spend.

## What’s in v1

- **Circle** — create your circle (name + Family or Group), add members
  with roles. Families use Adult / Child; groups use Leader / Supervisor /
  Host / Member. Each person chooses what to share: location, schedule,
  money — any toggle can be turned off.
- **Availability** — a shared view of who is free when.
- **Help Board** — post a need, split it into claimable parts
  (for example a grocery run: buy, collect, deliver, unload, put away).
  Anyone can claim a part, release it, or mark it done.
- **Chat** — a chat for this circle only.
- **Check-ins + Stories** — location as “I’m at…” check-ins, not 24/7
  tracking. Stories are casual **text** updates for now; photo/video
  upload is not in this version.
- **Money** — a simple shared log and even split. No bank connections.
- **Goals** — shared goals with progress (for example, save $200 for
  a family outing).

There is **no sample family** in this version. The app starts empty:
you create your own circle first, then add your own members and content.

## How to run it locally

No build step, no install. Just the files in this folder:
`index.html`, `styles.css`, `app.js`.

**Option 1 — double-click (quickest):**
Open `index.html` in your browser. It works, but some browsers limit
local files — if anything looks off, use Option 2.

**Option 2 — VS Code Live Server (recommended):**
1. Open this folder in VS Code.
2. Install the **Live Server** extension (once).
3. Right-click `index.html` → **Open with Live Server**.

Your circle is saved in your browser (localStorage), so it is still
there when you come back on the same device and browser.

## How to share it — hosting (free)

The easiest way to share a link is **GitHub Pages** — see
[HOSTING.md](HOSTING.md) for the comparison and steps. In short:

1. Push this folder to your GitHub repository (for example
   `BarnesL5/A7---Circall`).
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**,
   branch `main`, folder `/ (root)`, then **Save**.
4. Wait a minute or two. Your link will look like:
   `https://BarnesL5.github.io/A7---Circall/`

**Important — what the hosted version is and isn’t:**
- It is a **demo webapp**. Each visitor starts with their own empty
  circle, saved only in their own browser.
- There is **no shared data** yet: if you add a member or post a need,
  nobody else sees it. There are **no real accounts** yet, and no real
  invites are sent — adding a member adds them on that device only.
- That is expected at this stage. Shared data + real accounts is the
  next step, below.

## Next step: a real webapp with Google login

To turn this into a real shared webapp — one circle that everyone in
it can actually see, with Google sign-in — you need a backend and
real accounts. The recommended path is **Firebase**:

1. Create a free project at [Firebase Console](https://console.firebase.google.com/)
   (this creates a Google Cloud project behind it).
2. In Firebase, go to **Build → Authentication → Sign-in method** and
   turn on **Google**.
3. In **Project settings**, register a web app and copy the Firebase
   config (apiKey, authDomain, projectId, and so on).
4. In `app.js`, find `AUTH_CONFIG` at the top. It currently says:
   ```js
   const AUTH_CONFIG = {
     googleClientId: "YOUR_GOOGLE_CLIENT_ID_HERE",
     authProvider: "firebase",
     enabled: false
   };
   ```
   Replace `"YOUR_GOOGLE_CLIENT_ID_HERE"` with your real Google /
   Firebase client ID, set `enabled: true`, and wire the
   “Sign in with Google” button (currently disabled in `index.html`)
   to Firebase Authentication. Then add a database (Firestore) so
   circles, members, help requests, chat, and money are shared
   instead of living in each person’s browser alone.

No real credentials are included in this project — the placeholder
above is the only place a client ID belongs, and only after you
create your own Firebase project. **Never commit a real private key
or service-account file to GitHub.**

Alternative: Google Identity Services (Sign in with Google button)
plus your own backend/database. Firebase is recommended first
because hosting + login + database come as one package — see
[HOSTING.md](HOSTING.md).

## Project layout

```text
index.html   — the page: setup screen, tabs, and all the forms
styles.css   — all the styling, no framework
app.js       — all the logic: create circle, members, help board,
               chat, check-ins, Stories, money, goals; saved in
               localStorage under the key "circall-webapp-v1"
README.md    — this file
HOSTING.md   — hosting comparison + GitHub Pages steps
```

## What’s NOT done yet

- Real Google login (placeholder only — see above).
- Shared backend / database — data is per-browser only for now.
- Real invites (email / link) — adding a member is local-only.
- Photo/video Stories — text updates only in this version.
- No mobile app — this is a webapp on purpose, before any app work.
