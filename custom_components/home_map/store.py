"""Persistent storage for Home Map floor plan data."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

STORAGE_VERSION = 1
STORAGE_KEY = "home_map.floor_plan"


class HomeMapStore:
    """Store floor plan layout data."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict = {}

    async def async_load(self) -> dict:
        """Load data from disk."""
        data = await self._store.async_load()
        self._data = data or {"floors": []}
        return self._data

    async def async_save(self, data: dict) -> None:
        """Save data to disk."""
        self._data = data
        await self._store.async_save(data)

    @property
    def data(self) -> dict:
        """Return current data."""
        return self._data
