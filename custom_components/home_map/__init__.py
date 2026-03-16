"""The Home Map integration."""

from __future__ import annotations

import time

from homeassistant.components.frontend import (
    async_register_built_in_panel,
    async_remove_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv

from .api import HomeMapFloorPlanView
from .const import DOMAIN, LOGGER
from .store import HomeMapStore

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up Home Map."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Map from a config entry."""
    store = HomeMapStore(hass)
    await store.async_load()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["store"] = store

    # Register API view
    hass.http.register_view(HomeMapFloorPlanView)

    # Register static path for panel JS
    panel_path = hass.config.path("custom_components/home_map/panel.js")
    await hass.http.async_register_static_paths(
        [StaticPathConfig("/home_map/panel.js", panel_path, False)]
    )

    # Register sidebar panel
    cache_buster = str(int(time.time()))
    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="Home Map",
        sidebar_icon="mdi:floor-plan",
        frontend_url_path="home-map",
        config={
            "_panel_custom": {
                "name": "home-map-panel",
                "module_url": f"/home_map/panel.js?v={cache_buster}",
            }
        },
        require_admin=False,
    )

    LOGGER.info("Home Map panel registered")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Home Map."""
    async_remove_panel(hass, "home-map")
    hass.data[DOMAIN].pop("store", None)
    return True
