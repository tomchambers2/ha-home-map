# Deploying ha-home-map to Home Assistant

Merging to main deploys. `.github/workflows/deploy.yml` reaches netcup, where
`portfolio/bin/app-deploy` checks out main and runs `bin/deploy-server`:

1. Checks the Python compiles and `panel.js` parses.
2. Compares every file in `custom_components/home_map` with the live copy on HA
   (`ssh ha-host`) and copies only what changed, backing up the old files to
   `/config/backups/deploy-*-home_map-<sha>/`.
3. A panel-only change reloads the integration. A Python or manifest change restarts HA core and
   checks `home_map` is loaded again.
4. If the config check or restart fails, the old files are put back.

After a deploy, check the panel renders in light and dark themes (about
1344x952 canvas at 1600x1100, no console errors).
