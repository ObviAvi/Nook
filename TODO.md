# Nook Agentic Implementation TODO

## Completed in this migration

- [x] Replace legacy frontend-only ranking flow with JS backend API pipeline.
- [x] Add LLM structured extraction endpoint for natural language preference parsing.
- [x] Add dynamic Overpass category query pipeline with amenity normalization.
- [x] Add WLC ranking engine with exponential distance decay + price factor + min-max score normalization.
- [x] Return ranked apartments as GeoJSON `FeatureCollection` with root `id` and score-rich `properties`.
- [x] Migrate Mapbox rendering to data-driven expressions on `final_normalized_score`.
- [x] Implement `setFeatureState` hover and active marker interactions.
- [x] Remove obsolete prototype files (`fakeListings`, `sampleRegions`, manual ranking helpers).
- [x] Update README and dev scripts for fullstack local runtime.

## Backend next tasks (Richard)

- [ ] Harden RentCast adapter against exact production response shape and pagination.
- [ ] Add endpoint-level unit tests for LLM extraction validation and ranking outputs.
- [ ] Add server-side request metrics (latency per stage: LLM, listings, Overpass, ranking).
- [ ] Add persistent cache layer for Overpass and listing responses.
- [ ] Add configurable `alpha` and `beta` per search request.

## Frontend next tasks (Avi)

- [ ] Add chat transcript UI around the prompt box for multi-turn refinement.
- [ ] Add ranked feature hover-card that shows top 3 weighted category distance justifications.
- [ ] Add loading skeletons and optimistic UI state transitions.

## Agentic loop tasks (joint)

- [ ] Integrate Mapbox MCP server tool calls for follow-up questions.
- [ ] Include viewport bounds + top apartment IDs in follow-up LLM context.
- [ ] Implement MCP-driven UI actuation commands (`flyTo`, popup open, shortlist updates).
- [ ] Add route-time matrix comparison for commute-based ranking refinement.

## Definition of done for hackathon demo

- [ ] User enters one natural language request and receives ranked map results in < 8s median.
- [ ] At least one follow-up question is answered with an MCP tool call.
- [ ] Demo includes transparent score explanation for selected apartment.