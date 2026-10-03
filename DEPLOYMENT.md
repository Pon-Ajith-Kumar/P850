# P850 deployment and notes update guide

## One-time setup before the persistence release

1. Keep the Render web service on the **Free** plan. The database is Neon PostgreSQL; do not create a paid Render database.
2. In Neon, rotate the database role password if requested, then copy the connection string for the `p850-notes` project's `production` branch and `neondb` database.
3. In Render, open the P850 service's **Environment** page and save that connection string as the secret `DATABASE_URL`. Do this before the first persistence-code deployment. Do not put it in a `VITE_` variable or commit it.
4. For the one-time data migration, put the same URL in the local project `.env` file (which is ignored by Git). The migration script reads it from there. Then run:

   ```sh
   npm run migrate-live-data
   ```

   It imports the live `/api/test-entries`, `/api/mistakes`, and `/api/bookmarks` collections using `ON CONFLICT DO NOTHING`, so existing database IDs are preserved. The live collections were checked on 2026-09-27 and each returned HTTP 200 with zero records; rerunning the migration is safe.
5. Push the persistence code to `main`. Render then redeploys and creates/uses the PostgreSQL table. Confirm `https://p850.onrender.com/api/health` returns `{ "ok": true, "status": "healthy" }` before treating the deployment as ready.

After this setup, Analyzer results, mistakes, and bookmarks are stored in PostgreSQL and survive Render redeploys and restarts. If `DATABASE_URL` is absent in production, the server refuses to start rather than silently writing to Render's temporary filesystem.

## Every future image or notes update

1. Add or replace images directly under the fixed source root `/home/lenovo/Files/00) GATE CS Repo`, using the existing subject folder names as the first-level folders. Nested topic folders are supported.
2. From this repository, on branch `main`, run:

   ```sh
   npm run publish-notes
   ```

   This single command syncs images recursively, adds new files, replaces changed files at matching paths, keeps files missing from the source, rebuilds the app and generated subject index, commits only notes/index changes, then pushes `main` to GitHub. Render auto-deploys the pushed commit.
3. If GitHub authentication is unavailable, the notes commit remains local. Sign in to GitHub in your terminal and rerun `npm run publish-notes`; it will push the already-created commit even if there are no new image changes.
4. After Render reports the new commit live, open the portal and confirm the updated subject/topic. The database is separate, so the deploy does not clear Analyzer results, mistakes, or bookmarks.

To use a different source directory for one run:

```sh
P850_SOURCE_NOTES="/path/to/notes" npm run publish-notes
```

If the note folders or subject names change, keep each top-level folder name identical to its subject name in the portal. The script never deletes repository images just because they are absent from the source folder.
