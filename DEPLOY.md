# Deploying to itch.io

This repo auto-deploys the HTML5 build to itch.io via GitHub Actions + Butler.

## Run locally

From repo root:
- `cd pixelgrinder-frontend`
- `npm ci` (or `npm install` if `npm ci` fails)
- `npm run dev`

Open the URL Vite prints (usually `http://localhost:5173`).

## Manual ZIP upload (no Butler)

Use this when you want to upload a ZIP manually in the itch.io UI.

1) Build the HTML5 bundle
   - From repo root:
     - `cd pixelgrinder-frontend`
     - `npm ci`
     - `npm run build`

   If `npm ci` fails on Windows with an EPERM unlink error (locked `esbuild.exe`):
   - Close any running dev servers or editors watching `node_modules`.
   - Delete `pixelgrinder-frontend/node_modules`.
   - Re-run `npm ci`.
   - If it still fails, use `npm install` as a fallback.

   If `npm run build` says `vite` is not recognized, the install step failed.
   Re-run the install step above before building.

2) Create a ZIP with `index.html` at the root
   - From `pixelgrinder-frontend/dist`:
     - PowerShell: `Compress-Archive -Path * -DestinationPath ..\pixelgrinder-html5.zip`
     - Git Bash: `powershell.exe -NoProfile -Command "Compress-Archive -Path * -DestinationPath ..\pixelgrinder-html5.zip"`
     - File Explorer: select all files in `dist` -> right click -> Send to -> Compressed (zipped) folder

3) Upload on itch.io
   - Upload the ZIP under "Uploads".
   - Set the file type to HTML5 and check "This file will be played in the browser".
   - Save.

## One-time setup

1) Create an itch.io API key  
   Account Settings -> API Keys -> Generate.

2) Add the API key to GitHub as a secret  
   Repo -> Settings -> Secrets and variables -> Actions -> New repository secret  
   Name: `ITCH_API_KEY`  
   Value: your itch.io API key

## Deploy

- Push to `main` to trigger a deploy.
- Check the GitHub Actions tab for build status.

## Workflow

The workflow lives at `/.github/workflows/itchio.yml` and:
- runs `npm ci` and `npm run build` in `pixelgrinder-frontend`
- uploads `pixelgrinder-frontend/dist` to `tartuden/pixelgrinder:html5`
