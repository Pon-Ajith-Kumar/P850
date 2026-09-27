# P850 — Deployment & Update Guide

You've confirmed the app works locally: all 4 tabs load, images render correctly for
C Programming and Data Structures, and the access gate works. This is what to do next,
in order — first-time hosting, then the routine you'll repeat every time you add notes.

---

## Part 1 — One-time hosting setup (free tier: Render + Neon)

You only do this section once. `render.yaml` in the repo already describes the service,
so Render can pick most of this up automatically.

### 1. Push the repo to GitHub
If you haven't already:
```sh
git remote add origin <your-github-repo-url>
git push -u origin main
```
If `origin` already exists, just confirm `git remote -v` points at the right repo.

### 2. Create the database (Neon, free tier, outside Render)
1. Sign up at Neon and create a project (e.g. `p850-notes`).
2. Open the `production` branch → `neondb` database → copy the **connection string**.
3. Keep this string private — you'll paste it into Render only, never into a `VITE_`
   variable, never committed to git.

Render's own free Postgres expires after 30 days, which is exactly why the project uses
Neon for this instead — keep it that way.

### 3. Create the Render web service
1. New → Web Service → connect your GitHub repo.
2. Render should detect `render.yaml` and pre-fill the settings (Free plan, Node,
   `npm install --include=dev && npm run build` as build command, `npm run start` as
   start command). If it doesn't auto-detect, set those manually.
3. In the service's **Environment** tab, set these (marked `sync: false` in
   `render.yaml`, meaning Render won't auto-fill them — you enter them yourself):
   - `DATABASE_URL` → the Neon connection string from step 2
   - `P850_ACCESS_CODE` → your access code (same one in your local `.env`)
   - `P850_ACCESS_PIN` → your access PIN
4. Deploy.

### 4. Confirm the deploy is healthy
Once it's live, open:
```
https://<your-service>.onrender.com/api/health
```
It should return `{ "ok": true, "status": "healthy" }`. If it doesn't come up, check the
Render logs — the most common cause is a missing/incorrect `DATABASE_URL` (the server
deliberately refuses to start without one in production, so it never silently falls
back to Render's temporary disk).

### 5. Smoke-test the live site
- Log in with your access code/PIN.
- Open a subject with images (C Programming, Data Structures) and confirm the pages load.
- Add one test entry, one mistake, and one bookmark on the **live** site.
- Refresh the page (or reopen the URL later). If all three are still there, persistence
  is working — they're in Neon Postgres, not the server's disk.

That's the one-time setup done.

---

## Part 2 — Routine: updating notes and getting them onto the live site

This is the part you'll repeat every time you photograph new pages or fix a topic.
Nothing here changes what's already in the code — this is just the workflow it was
built for.

1. **Add or replace images** in your local source folder, using the existing subject
   folder names (nested topic folders are fine too):
   ```
   /home/lenovo/Files/00) GATE CS Repo/00 GATE Revision Notes/<Subject>/...
   ```
2. **From the project folder, on the `main` branch**, run:
   ```sh
   npm run publish-notes
   ```
   This one command:
   - copies new/changed images into `notes/` (never deletes images missing from the
     source — it only adds and replaces)
   - rebuilds the app's subject/topic data and the production build
   - commits **only** `notes/` and the generated subject data
   - pushes `main` to GitHub
3. **Render auto-deploys** the new commit. Give it a minute, then reload the live site
   and open the subject you updated to confirm the new pages show up.
4. **Your saved data is untouched.** Test Analyzer results, mistakes, and bookmarks
   live in Neon Postgres, completely separate from the git-based notes deploy — a
   notes update never touches that database, so nothing you've logged is at risk.

If `npm run publish-notes` says GitHub authentication is unavailable, sign in to GitHub
in your terminal and rerun the command — it'll push the commit it already made locally
even if there's nothing new to copy.

To publish from a different source folder for one run only:
```sh
P850_SOURCE_NOTES="/path/to/notes" npm run publish-notes
```

---

## Why state stays consistent (what's actually guaranteeing this)

- **Images** are committed to git and rebuilt into the site on every deploy — Render's
  free-tier disk being ephemeral doesn't matter, because the images never depend on
  that disk surviving a restart.
- **Test Analyzer / Mistakes / Bookmarks** are stored in Neon Postgres, reached through
  the app's API — also independent of Render's disk, and independent of notes deploys.
- **Local dev** (`npm run dev`) now runs a single notes-watcher instead of two competing
  ones, so editing images while the dev server is running regenerates the app data
  cleanly instead of racing itself.

## Quick troubleshooting reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/health` won't return healthy | `DATABASE_URL` missing/wrong on Render | Re-check the Environment tab value |
| New images don't appear after publish | Folder name doesn't match the subject name in the app | Match folder name exactly, rerun `npm run publish-notes` |
| `publish-notes` refuses to run | You're not on `main`, or it detected a note **deletion** | Switch to `main`; restore any accidentally-removed files before publishing |
| Saved test entries vanish after a redeploy | `DATABASE_URL` wasn't set before that deploy | Set it in Render, redeploy — data already in Postgres is unaffected either way |
