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
  nobody else sees it. Google sign-in is wired in (see below), but
  circles are still per-browser until Firestore is added.
- No real invites are sent — adding a member adds them on that device only.

## Google login — wired in

Google sign-in is wired to the Firebase project `a7---circall`
using Firebase Authentication (Google provider).

- The “Sign in with Google” button is on the setup screen and in the
  app header. Signing in fills in your name and shows you as signed
  in with Google. Sign out is in the app header.
- The Firebase web config lives in `app.js` (`firebaseConfig`). That
  is the public web config for a browser app — it is meant to be in
  client code. **Never commit a private key or service-account file.**
- **One step left in Firebase Console, or sign-in will fail:**
  go to **Authentication → Settings → Authorized domains** and add
  your hosting domain, e.g. `BarnesL5.github.io`, plus `localhost`
  for local testing. Firebase only allows sign-in from domains on
  that list.
- In Firebase Console, **Authentication → Sign-in method → Google**
  must stay enabled.

Shared circles are still the next step: add Firestore (Firebase
database) so circles, members, help requests, chat, and money are
shared instead of living in each person’s browser alone.

## Next step: shared data with Firestore

To turn this into a real shared webapp — one circle that everyone in
it can actually see — add Firestore in the same Firebase project,
then move the localStorage save/load in `app.js` to read/write that
circle in Firestore, keyed by the signed-in user.

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

- Shared backend / database (Firestore) — Google sign-in is wired in,
  but data is per-browser only for now.
- Real invites (email / link) — adding a member is local-only.
- Photo/video Stories — text updates only in this version.
- No mobile app — this is a webapp on purpose, before any app work.
