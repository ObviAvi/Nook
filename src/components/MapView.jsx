import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createCircleFeature } from '../lib/geo'

const SEARCH_AREA_SOURCE_ID = 'search-area-source'
const LISTINGS_SOURCE_ID = 'listings-source'
const POIS_SOURCE_ID = 'pois-source'
const SEARCH_FILL_LAYER_ID = 'search-area-fill'
const SEARCH_LINE_LAYER_ID = 'search-area-outline'
const SEARCH_CENTER_LAYER_ID = 'search-area-center'
const LISTINGS_LAYER_ID = 'listings-layer'
const LISTINGS_LABEL_LAYER_ID = 'listings-labels'
const LISTINGS_ACTIVE_LAYER_ID = 'listings-active'
const POIS_LAYER_ID = 'pois-layer'

function createFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  }
}

function getLightPresetFromHour(hour) {
  if (hour < 5 || hour >= 20) {
    return 'night'
  }

  if (hour < 8) {
    return 'dawn'
  }

  if (hour < 17) {
    return 'day'
  }

  return 'dusk'
}

function interpolateByStops(hour, stops) {
  for (let index = 0; index < stops.length - 1; index += 1) {
    const [startHour, startValue] = stops[index]
    const [endHour, endValue] = stops[index + 1]

    if (hour >= startHour && hour <= endHour) {
      const ratio = (hour - startHour) / (endHour - startHour)
      return startValue + (endValue - startValue) * ratio
    }
  }

  return stops[stops.length - 1][1]
}

function getDynamicLighting(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24

  return {
    azimuth: interpolateByStops(normalizedHour, [
      [0, 340],
      [6, 90],
      [12, 180],
      [18, 270],
      [24, 340],
    ]),
    polar: interpolateByStops(normalizedHour, [
      [0, 7],
      [6, 15],
      [12, 56],
      [18, 17],
      [24, 7],
    ]),
    intensity: interpolateByStops(normalizedHour, [
      [0, 0.14],
      [6, 0.32],
      [12, 0.62],
      [18, 0.36],
      [24, 0.14],
    ]),
    ambientIntensity: interpolateByStops(normalizedHour, [
      [0, 0.26],
      [6, 0.36],
      [12, 0.43],
      [18, 0.34],
      [24, 0.26],
    ]),
    shadowIntensity: interpolateByStops(normalizedHour, [
      [0, 0.3],
      [6, 0.9],
      [12, 0.58],
      [18, 0.85],
      [24, 0.3],
    ]),
  }
}

function applyLightingForHour(mapInstance, hour) {
  const lightPreset = getLightPresetFromHour(hour)
  const dynamicLighting = getDynamicLighting(hour)

  try {
    mapInstance.setConfigProperty('basemap', 'show3dObjects', true)
    mapInstance.setConfigProperty('basemap', 'lightPreset', lightPreset)
  } catch {
    // Ignore if the style does not expose Standard config properties.
  }

  if (typeof mapInstance.setLights !== 'function') {
    return
  }

  try {
    mapInstance.setLights([
      {
        id: 'ambient-neighborhood',
        type: 'ambient',
        properties: {
          color: lightPreset === 'night' ? '#8da6d8' : '#f4e2ca',
          intensity: dynamicLighting.ambientIntensity,
        },
      },
      {
        id: 'sun-neighborhood',
        type: 'directional',
        properties: {
          color: lightPreset === 'night' ? '#c8d2ee' : '#ffcf97',
          direction: [dynamicLighting.azimuth, dynamicLighting.polar],
          intensity: dynamicLighting.intensity,
          'cast-shadows': true,
          'shadow-intensity': dynamicLighting.shadowIntensity,
        },
      },
    ])
  } catch {
    // Ignore if the current style rejects custom lights.
  }
}

function getPopupMarkup(title, bodyLines) {
  const lines = bodyLines.filter(Boolean)
  return `
    <div class="map-popup-card">
      <h3>${title}</h3>
      ${lines.map((line) => `<p>${line}</p>`).join('')}
    </div>
  `
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getOverviewZoom(radiusMeters) {
  if (radiusMeters <= 900) {
    return 15.6
  }

  if (radiusMeters <= 1500) {
    return 15
  }

  if (radiusMeters <= 2200) {
    return 14.5
  }

  return 14
}

function createSearchAreaData(searchCenter, searchRadiusMeters) {
  return createFeatureCollection([
    createCircleFeature(searchCenter, searchRadiusMeters),
    {
      type: 'Feature',
      properties: {
        kind: 'center',
      },
      geometry: {
        type: 'Point',
        coordinates: searchCenter,
      },
    },
  ])
}

function createListingData(listings, activeListingId) {
  return createFeatureCollection(
    listings.map((listing) => ({
      ...listing,
      properties: {
        ...listing.properties,
        active: listing.properties.id === activeListingId,
        priceLabel: `$${(listing.properties.monthlyRent / 1000).toFixed(1)}k`,
      },
    })),
  )
}

function createPoiData(poiFeatures) {
  return createFeatureCollection(poiFeatures)
}

function ensureMapSourcesAndLayers(map) {
  if (!map.getSource(SEARCH_AREA_SOURCE_ID)) {
    map.addSource(SEARCH_AREA_SOURCE_ID, {
      type: 'geojson',
      data: createFeatureCollection([]),
    })
  }

  if (!map.getLayer(SEARCH_FILL_LAYER_ID)) {
    map.addLayer({
      id: SEARCH_FILL_LAYER_ID,
      type: 'fill',
      source: SEARCH_AREA_SOURCE_ID,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#6ec5ff',
        'fill-opacity': 0.1,
      },
    })
  }

  if (!map.getLayer(SEARCH_LINE_LAYER_ID)) {
    map.addLayer({
      id: SEARCH_LINE_LAYER_ID,
      type: 'line',
      source: SEARCH_AREA_SOURCE_ID,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': '#9fddff',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    })
  }

  if (!map.getLayer(SEARCH_CENTER_LAYER_ID)) {
    map.addLayer({
      id: SEARCH_CENTER_LAYER_ID,
      type: 'circle',
      source: SEARCH_AREA_SOURCE_ID,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#9fddff',
        'circle-stroke-color': '#09304b',
        'circle-stroke-width': 2,
      },
    })
  }

  if (!map.getSource(LISTINGS_SOURCE_ID)) {
    map.addSource(LISTINGS_SOURCE_ID, {
      type: 'geojson',
      data: createFeatureCollection([]),
    })
  }

  if (!map.getLayer(LISTINGS_LAYER_ID)) {
    map.addLayer({
      id: LISTINGS_LAYER_ID,
      type: 'circle',
      source: LISTINGS_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          0,
          7,
          4,
          10,
          10,
          14,
        ],
        'circle-color': [
          'case',
          ['boolean', ['get', 'active'], false],
          '#fff2c8',
          ['>=', ['get', 'score'], 6],
          '#f38c6b',
          ['>=', ['get', 'score'], 3],
          '#e16754',
          '#c64d46',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff7ef',
        'circle-opacity': 0.95,
      },
    })
  }

  if (!map.getLayer(LISTINGS_ACTIVE_LAYER_ID)) {
    map.addLayer({
      id: LISTINGS_ACTIVE_LAYER_ID,
      type: 'circle',
      source: LISTINGS_SOURCE_ID,
      filter: ['==', ['get', 'active'], true],
      paint: {
        'circle-radius': 18,
        'circle-color': 'rgba(255, 240, 198, 0.12)',
        'circle-stroke-color': '#ffe5a6',
        'circle-stroke-width': 2,
      },
    })
  }

  if (!map.getLayer(LISTINGS_LABEL_LAYER_ID)) {
    map.addLayer({
      id: LISTINGS_LABEL_LAYER_ID,
      type: 'symbol',
      source: LISTINGS_SOURCE_ID,
      layout: {
        'text-field': ['get', 'priceLabel'],
        'text-size': 11,
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.5],
      },
      paint: {
        'text-color': '#fffdf9',
        'text-halo-color': '#1f1321',
        'text-halo-width': 1.2,
      },
    })
  }

  if (!map.getSource(POIS_SOURCE_ID)) {
    map.addSource(POIS_SOURCE_ID, {
      type: 'geojson',
      data: createFeatureCollection([]),
    })
  }

  if (!map.getLayer(POIS_LAYER_ID)) {
    map.addLayer({
      id: POIS_LAYER_ID,
      type: 'circle',
      source: POIS_SOURCE_ID,
      paint: {
        'circle-radius': 5,
        'circle-color': ['coalesce', ['get', 'color'], '#8fd3ff'],
        'circle-stroke-color': '#062033',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.86,
      },
    })
  }
}

function updateMapData(map, { searchCenter, searchRadiusMeters, poiFeatures, listings, activeListing }) {
  const searchAreaSource = map.getSource(SEARCH_AREA_SOURCE_ID)
  const listingsSource = map.getSource(LISTINGS_SOURCE_ID)
  const poisSource = map.getSource(POIS_SOURCE_ID)

  searchAreaSource?.setData(createSearchAreaData(searchCenter, searchRadiusMeters))
  listingsSource?.setData(createListingData(listings, activeListing?.properties.id ?? null))
  poisSource?.setData(createPoiData(poiFeatures))
}

function MapView({
  token,
  mapStyle,
  timeOfDayHour,
  experienceStarted,
  searchCenter,
  searchRadiusMeters,
  poiFeatures,
  listings,
  activeListing,
  focusTarget,
  onSelectListing,
  onViewUpdate,
  landingQuery,
  onLandingQueryChange,
  landingSuggestions,
  onLandingSubmit,
  onLandingSuggestionSelect,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const onSelectListingRef = useRef(onSelectListing)
  const onViewUpdateRef = useRef(onViewUpdate)
  const experienceStartedRef = useRef(experienceStarted)
  const mapDataRef = useRef({
    searchCenter,
    searchRadiusMeters,
    poiFeatures,
    listings,
    activeListing,
    timeOfDayHour,
  })
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    onSelectListingRef.current = onSelectListing
  }, [onSelectListing])

  useEffect(() => {
    onViewUpdateRef.current = onViewUpdate
  }, [onViewUpdate])

  useEffect(() => {
    experienceStartedRef.current = experienceStarted
  }, [experienceStarted])

  useEffect(() => {
    mapDataRef.current = {
      searchCenter,
      searchRadiusMeters,
      poiFeatures,
      listings,
      activeListing,
      timeOfDayHour,
    }
  }, [
    searchCenter,
    searchRadiusMeters,
    poiFeatures,
    listings,
    activeListing,
    timeOfDayHour,
  ])

  useEffect(() => {
    if (!token || !mapContainerRef.current) {
      return
    }

    mapboxgl.accessToken = token
    const currentMapData = mapDataRef.current
    const currentExperienceStarted = experienceStartedRef.current

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: currentExperienceStarted ? currentMapData.searchCenter : [8, 18],
      zoom: currentExperienceStarted
        ? getOverviewZoom(currentMapData.searchRadiusMeters)
        : 1.3,
      pitch: currentExperienceStarted ? 52 : 0,
      bearing: currentExperienceStarted ? -18 : 0,
      projection: currentExperienceStarted ? 'mercator' : 'globe',
      antialias: true,
      maxPitch: 85,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.dragRotate.enable()
    map.touchZoomRotate.enableRotation()
    map.touchPitch.enable()

    map.on('move', () => {
      onViewUpdateRef.current({
        lng: map.getCenter().lng,
        lat: map.getCenter().lat,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      })
    })

    map.on('load', () => {
      const latestMapData = mapDataRef.current

      map.setFog({
        color: 'rgb(10, 23, 41)',
        'high-color': 'rgb(69, 108, 183)',
        'horizon-blend': 0.18,
        'space-color': 'rgb(5, 10, 18)',
        'star-intensity': 0.08,
      })

      ensureMapSourcesAndLayers(map)
      updateMapData(map, {
        searchCenter: latestMapData.searchCenter,
        searchRadiusMeters: latestMapData.searchRadiusMeters,
        poiFeatures: latestMapData.poiFeatures,
        listings: latestMapData.listings,
        activeListing: latestMapData.activeListing,
      })
      applyLightingForHour(map, latestMapData.timeOfDayHour)

      map.on('click', LISTINGS_LAYER_ID, (event) => {
        const listingFeature = event.features?.[0]

        if (!listingFeature) {
          return
        }

        const listingId = listingFeature.properties?.id

        if (listingId) {
          onSelectListingRef.current(listingId)
        }

        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({ offset: 18 })
          .setLngLat(event.lngLat)
          .setHTML(
            getPopupMarkup(escapeHtml(listingFeature.properties?.title ?? 'Listing'), [
              `${escapeHtml(listingFeature.properties?.neighborhood ?? 'Neighborhood')}`,
              `$${Number(listingFeature.properties?.monthlyRent ?? 0).toLocaleString()}/mo`,
              `${listingFeature.properties?.beds ?? '?'} bd / ${listingFeature.properties?.baths ?? '?'} ba`,
              `${listingFeature.properties?.rankLabel ?? ''}`,
            ]),
          )
          .addTo(map)
      })

      map.on('click', POIS_LAYER_ID, (event) => {
        const poiFeature = event.features?.[0]

        if (!poiFeature) {
          return
        }

        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({ offset: 14 })
          .setLngLat(event.lngLat)
          .setHTML(
            getPopupMarkup(escapeHtml(poiFeature.properties?.name ?? 'POI'), [
              `${escapeHtml(poiFeature.properties?.categoryLabel ?? 'Service')}`,
              `${escapeHtml(poiFeature.properties?.rawType ?? 'poi')}`,
            ]),
          )
          .addTo(map)
      })

      for (const layerId of [LISTINGS_LAYER_ID, POIS_LAYER_ID]) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      }
    })

    map.on('error', () => {
      setMapError('Map failed to load. Check your token and network connection.')
    })

    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [token, mapStyle])

  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) {
      return
    }

    if (experienceStarted) {
      try {
        mapRef.current.setProjection('mercator')
      } catch {
        // Ignore projection changes if unavailable.
      }

      return
    }

    try {
      mapRef.current.setProjection('globe')
    } catch {
      // Ignore projection changes if unavailable.
    }

    mapRef.current.easeTo({
      center: [8, 18],
      zoom: 1.3,
      pitch: 0,
      bearing: 0,
      duration: 1400,
    })
  }, [experienceStarted])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    applyLightingForHour(mapRef.current, timeOfDayHour)
  }, [timeOfDayHour])

  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) {
      return
    }

    ensureMapSourcesAndLayers(mapRef.current)
    updateMapData(mapRef.current, {
      searchCenter,
      searchRadiusMeters,
      poiFeatures,
      listings,
      activeListing,
    })
  }, [searchCenter, searchRadiusMeters, poiFeatures, listings, activeListing])

  useEffect(() => {
    if (!focusTarget || !mapRef.current) {
      return
    }

    mapRef.current.flyTo({
      center: focusTarget.center,
      zoom: focusTarget.zoom,
      pitch: focusTarget.pitch,
      bearing: focusTarget.bearing,
      duration: 1400,
      essential: true,
    })
  }, [focusTarget])

  useEffect(() => {
    if (!activeListing || !mapRef.current?.isStyleLoaded()) {
      return
    }

    popupRef.current?.remove()
    popupRef.current = new mapboxgl.Popup({ offset: 18 })
      .setLngLat(activeListing.geometry.coordinates)
      .setHTML(
        getPopupMarkup(escapeHtml(activeListing.properties.title), [
          `${escapeHtml(activeListing.properties.neighborhood)}`,
          `$${activeListing.properties.monthlyRent.toLocaleString()}/mo`,
          `${activeListing.properties.beds} bd / ${activeListing.properties.baths} ba / ${activeListing.properties.sqft} sq ft`,
          `${activeListing.properties.rankLabel}`,
        ]),
      )
      .addTo(mapRef.current)
  }, [activeListing])

  const resetToSearchArea = () => {
    if (!mapRef.current) {
      return
    }

    mapRef.current.easeTo({
      center: searchCenter,
      zoom: getOverviewZoom(searchRadiusMeters),
      pitch: 52,
      bearing: -18,
      duration: 900,
    })
  }

  const applyZoomPreset = (zoom) => {
    if (!mapRef.current) {
      return
    }

    mapRef.current.easeTo({
      zoom,
      duration: 700,
    })
  }

  const adjustPitch = (delta) => {
    if (!mapRef.current) {
      return
    }

    const nextPitch = Math.max(0, Math.min(78, mapRef.current.getPitch() + delta))

    mapRef.current.easeTo({
      pitch: nextPitch,
      duration: 320,
    })
  }

  const adjustBearing = (delta) => {
    if (!mapRef.current) {
      return
    }

    mapRef.current.easeTo({
      bearing: mapRef.current.getBearing() + delta,
      duration: 320,
    })
  }

  const cinematicView = () => {
    if (!mapRef.current) {
      return
    }

    mapRef.current.easeTo({
      center: activeListing?.geometry.coordinates ?? searchCenter,
      zoom: activeListing ? 16.1 : getOverviewZoom(searchRadiusMeters) + 0.8,
      pitch: 68,
      bearing: -32,
      duration: 900,
    })
  }

  return (
    <section className="map-panel">
      {experienceStarted ? (
        <>
          <header className="map-header glass-card">
            <div>
              <p className="label">Nook</p>
              <h1>Neighborhood Fit Explorer</h1>
            </div>
            <div className="map-actions">
              <button type="button" onClick={resetToSearchArea}>
                Search Area
              </button>
              <button type="button" onClick={() => applyZoomPreset(14)}>
                Overview
              </button>
              <button type="button" onClick={() => applyZoomPreset(16.25)}>
                Detail
              </button>
              <button type="button" onClick={() => adjustPitch(-8)}>
                Tilt -
              </button>
              <button type="button" onClick={() => adjustPitch(8)}>
                Tilt +
              </button>
              <button type="button" onClick={() => adjustBearing(-15)}>
                Rotate -
              </button>
              <button type="button" onClick={() => adjustBearing(15)}>
                Rotate +
              </button>
              <button type="button" onClick={cinematicView}>
                3D View
              </button>
            </div>
          </header>

          <p className="gesture-hint">
            Tip: the blue search ring is the active search area, ochre markers are
            sample rentals, and colored dots are live neighborhood services.
          </p>
        </>
      ) : null}

      {mapError ? <p className="map-error glass-card">{mapError}</p> : null}

      <div ref={mapContainerRef} className={`map-canvas ${experienceStarted ? '' : 'map-canvas-landing'}`} />

      {!experienceStarted ? (
        <div className="landing-hero">
          <div className="landing-wordmark" aria-hidden="true">
            Nook
          </div>
          <div className="landing-content">
            <p className="label">Neighborhood Search</p>
            <h1>Find the block that fits you best.</h1>
            <p className="landing-copy">
              Start from the globe, choose a place, then tune price and amenity
              priorities to see which rentals rise to the top.
            </p>
            <form className="landing-search" onSubmit={onLandingSubmit}>
              <input
                type="text"
                placeholder="Search a place"
                value={landingQuery}
                onChange={(event) => onLandingQueryChange(event.target.value)}
                list="landing-region-options"
                aria-label="Search a place"
              />
              <button type="submit">Enter Nook</button>
              <datalist id="landing-region-options">
                {landingSuggestions.map((region) => (
                  <option key={region.id} value={region.name} />
                ))}
              </datalist>
            </form>
            <div className="landing-suggestions">
              {landingSuggestions.slice(0, 3).map((region) => (
                <button
                  key={region.id}
                  type="button"
                  className="landing-pill"
                  onClick={() => onLandingSuggestionSelect(region)}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default MapView
