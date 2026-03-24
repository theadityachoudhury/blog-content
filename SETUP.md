# blog-content repo setup

Copy the files from this directory into your `blog-content` repo root, then follow the steps below.

## Files to copy

```
docs/content-repo/
├── package.json          → package.json
├── tsconfig.json         → tsconfig.json
├── scripts/
│   ├── new-post.ts       → scripts/new-post.ts
│   └── generate.ts       → scripts/generate.ts
├── .husky/
│   └── pre-commit        → .husky/pre-commit
└── trigger-deploy.yml    → .github/workflows/trigger-deploy.yml  (already done)
```

## .gitignore

Create `.gitignore` in blog-content:

```
node_modules/
```

Note: `dist/` is **not** gitignored — it must be committed so Vercel can fetch it.

## First-time setup

```bash
cd /path/to/blog-content

# Install dependencies + set up husky git hook
npm install

# Make the pre-commit hook executable
chmod +x .husky/pre-commit
```

## Writing a new post

```bash
# 1. Scaffold a post with frontmatter
npm run new-post
# → prompts for title, description, tags, slug
# → creates posts/YYYY-MM-DD-slug.md

# 2. Write the content
open posts/YYYY-MM-DD-slug.md   # or your editor of choice

# 3. Commit — hook validates + regenerates dist/ automatically
git add posts/
git commit -m "add: your post title"
# pre-commit hook runs:
#   → validates frontmatter
#   → runs generate.ts → writes dist/index.json + dist/posts/*.md
#   → stages dist/

# 4. Push → GitHub Action fires → Vercel rebuilds
git push
```

## How it works

```
posts/*.md  (source — with frontmatter)
     │
     ▼  generate.ts (runs on pre-commit)
dist/
├── index.json        ← PostMeta[] sorted by date
└── posts/
    └── slug.md       ← body only (frontmatter stripped)
     │
     ▼  Vercel prebuild (fetch-content.ts in app repo)
app's public/content/  ← downloaded from GitHub API, no parsing needed
```

## Draft posts

Set `draft: true` in frontmatter to push without publishing. The generate script skips drafts entirely — they won't appear in `dist/`.
