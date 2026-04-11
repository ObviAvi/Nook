# Nook Agentic Explorer

Agentic apartment discovery prototype with an integrated JS backend and React + Mapbox frontend.

## Architecture

- Frontend (`src`): prompt input, ranked listing panel, and Mapbox visualization.
- Backend (`server`): LLM structured extraction, listing fetch, Overpass amenity aggregation, WLC ranking, and GeoJSON response generation.
- Data contract: backend returns ranked apartments as a GeoJSON `FeatureCollection` with root feature IDs and normalized ranking scores in `properties`.

## Implemented Pipeline

1. Preference extraction with LLM structured output (`/api/search` parses prompt into strict JSON constraints + category weights).
2. Listing ingestion is mock-first for high velocity, with optional RentCast mode and automatic fallback to curated mock listings.
3. Overpass amenity fetch by weighted categories using dynamic queries with `out center tags`.
4. Weighted linear combination ranking:
	- Exponential distance decay: $e^{-\beta d}$
	- Budget-based linear price factor
	- Min-max normalized final score in $[0,1]$
5. Frontend map sync using `setData()` and `setFeatureState` for active/hover interactions.

## Environment Variables

Copy `.env.example` to `.env.local` in the project root and fill values:

```env
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash-preview
RENTCAST_API_KEY=your-rentcast-key
API_PORT=8787
```

Notes:

- `GEMINI_API_KEY` is required for prompt extraction.
- `RENTCAST_API_KEY` is optional; if absent, the backend uses mock listings.
- The sidebar includes a listing source selector: `Mock Data` (default) or `RentCast` (opt-in).
- Backend loads environment variables from `.env` and `.env.local` automatically at server startup.

## Quick Start

```bash
npm install
//npm install @rolldown/binding-win32-x64-msvc@1.0.0-rc.15 --save-dev
npm run dev
```

`npm run dev` starts both:

- Vite frontend
- Node API server (`server/index.js`)

## Key Files

- `server/index.js`: API entrypoint (`/api/search`, `/api/health`)
- `server/services/llm.js`: strict JSON extraction with Gemini (`@google/genai`)
- `server/services/listings.js`: RentCast + mock listing adapter with SHA-256 IDs
- `server/services/overpass.js`: amenity aggregation by category
- `server/services/ranking.js`: WLC scoring and GeoJSON output
- `src/App.jsx`: frontend orchestration and state
- `src/components/MapView.jsx`: map rendering and feature-state interactivity
- `src/components/Sidebar.jsx`: prompt and ranking UI

## Verify

```bash
npm run lint
npm run build
```
