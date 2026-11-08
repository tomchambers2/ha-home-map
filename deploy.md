# Deploying ha-home-map to Home Assistant

The live copy is `/config/custom_components/home_map/panel.js` on the Home Assistant host (`ssh ha-host`).
Always pull the live file first and diff it against the repo — the live file has been ahead of the repo before. Never overwrite blindly.

1. `ssh ha-host 'cat /config/custom_components/home_map/panel.js' | diff - custom_components/home_map/panel.js` — any unexpected difference means commit the live file into the repo first.
2. Back up: `ssh ha-host 'cp /config/custom_components/home_map/panel.js /config/custom_components/home_map/panel.js.bak.$(date +%Y%m%d%H%M)'`
3. Copy the JS only: `ssh ha-host 'cat > /config/custom_components/home_map/panel.js' < custom_components/home_map/panel.js` (no HA restart needed).
4. Hard-refresh the panel in the browser.
5. Check with Playwright that the panel renders in light and dark themes (about 1344x952 canvas, no console errors).
