# P850

Private GATE study portal built with React, Vite, and a small Node.js API.

## Notes and images

The fixed local notes source is `/home/lenovo/Files/00) GATE CS Repo/00 GATE Revision Notes`. Before publishing an update, run `npm run sync-notes`. The script recursively copies supported image files into `notes/`, including new subject folders and nested topic folders. It adds new paths, replaces changed files at the same path, and deliberately does not remove files missing from the source. It prints added/replaced/unchanged totals.

To use a different source location, set `P850_SOURCE_NOTES` for that command.

Then review and publish the repo changes:

```sh
npm run sync-notes
npm run build
git status --short
git add notes src/data/subjects.json
git commit -m "Update revision notes"
git push origin main
```

Render redeploys the website from the pushed GitHub commit. Images stay versioned in Git; they are not written to Render's ephemeral filesystem.

## Saved app data

Test Analyzer results, mistakes, and bookmarks are stored in PostgreSQL through the server API. Local development uses ignored JSON files under `data/` when no database URL is set. Production requires `DATABASE_URL` and refuses to start without it, so hosted records cannot silently be written to Render's temporary filesystem.

Keep Render itself on the Free web service plan. Render Free web services have ephemeral filesystems, and Render Free Postgres expires after 30 days, so neither is a permanent home for these records. Use a free PostgreSQL account hosted outside Render, put its connection URL into the Render service's secret `DATABASE_URL` environment variable, and keep the database URL out of client-side `VITE_` variables. A database URL is required before deploying the persistence change. Free provider quotas and retention rules can change; check the provider's current plan and keep an export backup.

Before switching the live service to this version, export existing records from the current `/api/test-entries`, `/api/mistakes`, and `/api/bookmarks` endpoints and import them into the new database. Use `npm run migrate-live-data` after setting `DATABASE_URL`; it fetches those three collections from the live portal and inserts them without overwriting existing rows. This only works while the old app endpoints are available.

## Local development

1. Install dependencies with npm install.
2. Copy .env.example to .env and set the access values.
3. Run npm run dev.

To use PostgreSQL locally, set DATABASE_URL in .env. Without it, the server uses the local JSON files.
