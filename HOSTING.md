# Hosting Circall — plain-terms comparison

You have a working webapp in this folder (`index.html`, `styles.css`,
`app.js` — no build step). To share it as a link, it needs to live on
a host. Here are the three sensible options, in the order to try them.

## 1. GitHub Pages — start here (recommended first)

- **Cost:** free.
- **What it is:** GitHub hosts your static files and gives you a link.
- **Good for:** sharing this version right away, so people can open it,
  create their own circle, and try it.
- **Limit:** static only. No shared data, no login, no backend. Each
  visitor gets their own empty circle in their own browser
  (localStorage). That is a limit of this version of the app, not a
  mistake in the hosting.
- **Link looks like:** `https://BarnesL5.github.io/A7---Circall/`

### Steps (GitHub Pages)
1. Push this folder to your repository (for example
   `BarnesL5/A7---Circall`), on the `main` branch, at the root
   (so `index.html` is at the top level of the repo).
2. On GitHub, open the repo → **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to
   **Deploy from a branch**.
4. Set **Branch** to `main` and **Folder** to `/ (root)`, then **Save**.
5. Wait a minute or two, refresh the Pages settings — GitHub shows
   your live link at the top. Share that link.
6. Every time you push a change to `main`, GitHub Pages updates the
   live site automatically (usually within a minute or two).

## 2. Vercel / Netlify — also good, free tier

- **Cost:** free tier is plenty for this.
- **What it is:** hosts like GitHub Pages, but built for webapps.
  You connect your GitHub repo and it deploys on every push.
- **Good for:** a slightly nicer preview link, and later, when you
  want small server functions (for example, sending a real invite)
  without running your own server.
- **Limit:** same as GitHub Pages for this version — still no shared
  data or login until you add a backend/database.
- **When to use it:** if GitHub Pages feels awkward, or when you
  start adding server-side bits. Not needed to share the first link.

## 3. Firebase Hosting + Authentication — best fit for Google login

- **Cost:** free tier (Spark plan) covers getting started.
- **What it is:** Google’s hosting + login + database, in one place.
  This is the recommended path for the **next step** in the README:
  real Google sign-in, so the circle is shared between the people
  in it instead of living in each person’s browser.
- **Good for:** Google login, a shared database (Firestore), and
  hosting — all under one Google Cloud / Firebase project.
- **Needs:** a Firebase project (free to create), Google sign-in
  turned on in Firebase Authentication, and a Firebase config
  (including a client ID) pasted into `AUTH_CONFIG` in `app.js`.
  No real credentials are in this project — you create your own.
- **When to use it:** after the GitHub Pages demo link has been
  shared and tried. Move to Firebase when you want real accounts
  and shared circles.

## Recommendation

1. **Now:** GitHub Pages — share the link, let people create their
   own circle and try it.
2. **Next:** Firebase Hosting + Authentication — add Google login
   and a shared database, so a circle is truly shared.
3. **Later, only if needed:** Vercel/Netlify if you outgrow the
   above or want server functions for invites/notifications.

No mobile app step is needed to do any of this — the webapp comes
first, on purpose.
