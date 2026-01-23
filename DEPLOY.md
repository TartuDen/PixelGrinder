# Deploying to itch.io

This repo auto-deploys the HTML5 build to itch.io via GitHub Actions + Butler.

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
