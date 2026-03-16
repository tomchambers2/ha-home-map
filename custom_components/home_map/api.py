"""REST API views for Home Map."""

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from .const import DOMAIN


class HomeMapFloorPlanView(HomeAssistantView):
    """Handle floor plan data requests."""

    url = "/api/home_map/floor_plan"
    name = "api:home_map:floor_plan"

    async def get(self, request: web.Request) -> web.Response:
        """Return saved floor plan data."""
        hass = request.app["hass"]
        store = hass.data[DOMAIN]["store"]
        return self.json(store.data)

    async def post(self, request: web.Request) -> web.Response:
        """Save floor plan data."""
        hass = request.app["hass"]
        store = hass.data[DOMAIN]["store"]
        data = await request.json()
        await store.async_save(data)
        return self.json({"success": True})
