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
there when you come back on the same device and browser. If you
sign in with Google and use a shared circle, that circle is also
saved in Firestore — but only after the database has been created
in Firebase Console (see “Shared circles” below).

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
- It is a **demo webapp**. If you do **not** sign in, each visitor
  starts with their own empty circle, saved only in their own browser.
- If you **do** sign in with Google and create or join a **shared**
  circle, that circle lives in Firestore and everyone who joins it
  with the invite code sees the same members, help board, chat and
  money, live.
- No real invites are sent by email — you share the 6-character
  invite code yourself, and the other person signs in with Google
  and joins with that code.

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

## Shared circles — now in the app (Firestore)

A shared circle is one document in Firestore, in the `circles`
collection. One document holds the whole circle: name, kind, owner,
invite code, members, availability, help requests, chat, check-ins,
Stories, money, goals and `nextId`. When anyone in the circle makes
a change, the app saves it to Firestore and everyone else sees it
live (the app listens with `onSnapshot`).

**Before sharing works, create the database (once, in the Console):**

1. Go to [Firebase Console](https://console.firebase.google.com/)
   and open the project `a7---circall`.
2. Go to **Build → Firestore Database**.
3. Click **Create database**.
4. When it asks, choose **Start in test mode** for now (the rules
   in `firestore.rules` below tighten this to signed-in users only).
5. Pick a region close to you (for example `nam5 (United States)`),
   then click **Enable**. The database is free to start.

**Publish the security rules:**

- Easiest way (no install): in Firestore Database, open the
  **Rules** tab, paste the contents of `firestore.rules` from this
  folder, and click **Publish**.
- Or with the Firebase CLI: `firebase deploy --only firestore:rules`.

The rules in `firestore.rules` allow read/write only for signed-in
users (`request.auth != null`). That is a starter rule — it is **not**
production-secure, because it does not check that you are a member
of that circle. Before real family use, tighten it to members-only
(see the comments in `firestore.rules`).

**How sharing works, in plain terms:**

1. Sign in with Google.
2. On the setup screen, fill in the circle name, kind and your name,
   then tap **Create a shared circle**. You get a 6-character invite
   code — share it with your people.
3. They open the same link, sign in with Google, and on the setup
   screen tap **Join a shared circle** with that code and their name.
4. From then on, everyone in that circle sees the same thing, live.
   The header shows **Shared** and the invite code, with a Copy button.
5. Already have a local-only circle? Open it, sign in, and tap
   **Share this circle** in the header. It uploads that circle to
   Firestore and switches you to shared mode.
6. If you are not signed in, or Firestore is not set up yet, the app
   falls back to **On this device only** (localStorage) and says so
   in the header.

No sample data is seeded — every circle starts empty.

## Project layout

```text
index.html      — the page: setup screen, tabs, and all the forms
styles.css      — all the styling, no framework
app.js          — all the logic: create/join/share circles, members,
                  help board, chat, check-ins, Stories, money, goals;
                  shared circles in Firestore, local-only circles in
                  localStorage under the key "circall-webapp-v1"
firestore.rules — Firestore security rules (signed-in users only;
                  see the comments in the file before real family use)
README.md       — this file
HOSTING.md      — hosting comparison + GitHub Pages steps
```

## For the builder (not shown in the app)

The screens people see never mention Firestore, Firebase, localStorage,
authorized domains, or security rules — that wording lives here and in
code comments, so people trying the app just see plain language
(“Shared”, “Only on this device”, “Sign in with Google”).

The technical summary, for the person setting it up:

- **Firebase project:** `a7---circall`. Google sign-in uses Firebase
  Authentication (Google provider); the public web config lives in
  `app.js` (`firebaseConfig`). Sign-in only works from domains listed
  under **Authentication → Settings → Authorized domains** (e.g.
  `BarnesL5.github.io`, plus `localhost` for local testing), and
  Google must stay enabled under **Authentication → Sign-in method**.
- **Shared circles:** one document per circle in the Firestore
  `circles` collection, with live updates via `onSnapshot`. Writes are
  debounced and guarded against echo loops (see `applyingRemote` in
  `app.js`). The database must be created once in Firebase Console
  (**Build → Firestore Database → Create database**, test mode to
  start) — see “Shared circles” above.
- **Local-only circles:** saved in this browser in localStorage under
  the key `circall-webapp-v1`. Which shared circle this browser is
  attached to is stored separately under `circall-webapp-shared-v1`.
  A shared circle is also saved locally, so the app still opens with
  the last seen data if the shared copy can't be reached.
- **Rules:** `firestore.rules` allows read/write only for signed-in
  users (`request.auth != null`). That is a starter rule — it is
  **not** production-secure, because it does not check membership of
  that circle. Tighten it to members-only before real family use
  (see the comments in `firestore.rules`).

## What’s NOT done yet

- Members-only Firestore rules — the rules now allow any signed-in
  user, not just members of that circle (see `firestore.rules`).
- Real invites (email / link) — you share the 6-character invite
  code yourself; adding a member without the code is local-only.
- Photo/video Stories — text updates only in this version.
- No mobile app — this is a webapp on purpose, before any app work.
