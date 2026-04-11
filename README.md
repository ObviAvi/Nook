# Neighborhood Fit Explorer Prototype

Prototype React + Mapbox app for comparing fake rental listings against real POI data from OpenStreetMap via Overpass.

## What It Does

- Shows a 3D Mapbox scene with live lighting controls.
- Uses sample regions as the search-area input for now.
- Loads real POIs from OSM for selected services like groceries, parks, gyms, and cafes.
- Overlays hardcoded GeoJSON listings on the map.
- Scores and ranks listings by how many selected POIs fall within a nearby matching radius.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```

3. Start the dev server:

```bash
npm run dev
```

## Current Prototype Scope

- Region input is implemented as sample presets, not free-text geocoding yet.
- Listings are hardcoded GeoJSON features.
- POIs are fetched live from `overpass-api.de` at runtime.
- Listing ranking is currently a simple count of selected POIs within 1.2 km of each listing.

## Main Files

- `src/App.jsx`: search state, ranking, and Overpass orchestration.
- `src/components/MapView.jsx`: 3D Mapbox scene and live overlay layers.
- `src/components/Sidebar.jsx`: region picker, filters, and ranked listing UI.
- `src/data/fakeListings.js`: hardcoded sample listings.
- `src/data/sampleRegions.js`: sample regions used as search areas.
- `src/lib/overpass.js`: Overpass query builder and OSM normalization.

## Verify

```bash
npm run lint
npm run build
```
