import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const APARTMENTS_SOURCE_ID = 'apartments-source'
const AMENITIES_SOURCE_ID = 'amenities-source'
const APARTMENTS_LAYER_ID = 'apartments-layer'
const APARTMENTS_LABEL_LAYER_ID = 'apartments-label-layer'
const AMENITIES_LAYER_ID = 'amenities-layer'
const DEFAULT_CENTER = [-122.334, 47.61]
const DEFAULT_ZOOM = 11.8

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function popupMarkup(title, lines) {
  return `
    <div class="map-popup-card">
      <h3>${escapeHtml(title)}</h3>
      ${lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
    </div>
  `
}

function buildApartmentPopupLines(apartmentProperties = {}) {
  return [
    `Rank #${apartmentProperties.rank_position ?? '?'}`,
    `${Math.round(Number(apartmentProperties.final_normalized_score ?? 0) * 100)}% match`,
    `$${Number(apartmentProperties.monthly_price_usd ?? 0).toLocaleString()}/month`,
    `${apartmentProperties.bedrooms ?? '?'} bd / ${apartmentProperties.bathrooms ?? '?'} ba`,
  ]
}

function ensureSourcesAndLayers(map) {
  if (!map.getSource(APARTMENTS_SOURCE_ID)) {
    map.addSource(APARTMENTS_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
      promoteId: 'id',
    })
  }

  if (!map.getSource(AMENITIES_SOURCE_ID)) {
    map.addSource(AMENITIES_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
      promoteId: 'id',
    })
  }

  if (!map.getLayer(AMENITIES_LAYER_ID)) {
    map.addLayer({
      id: AMENITIES_LAYER_ID,
      type: 'circle',
      source: AMENITIES_SOURCE_ID,
      paint: {
        'circle-radius': 4.5,
        'circle-color': ['coalesce', ['get', 'color'], '#8fd3ff'],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#0f172a',
        'circle-opacity': 0.85,
      },
    })
  }

  if (!map.getLayer(APARTMENTS_LAYER_ID)) {
    map.addLayer({
      id: APARTMENTS_LAYER_ID,
      type: 'circle',
      source: APARTMENTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['exponential', 1.55],
          ['get', 'final_normalized_score'],
          0,
          7,
          1,
          19,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'final_normalized_score'],
          0,
          '#4b5563',
          0.5,
          '#f59e0b',
          1,
          '#10b981',
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['feature-state', 'active'], false],
          '#fff6d4',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffe8a3',
          '#111827',
        ],
        'circle-stroke-width': [
          'case',
          ['boolean', ['feature-state', 'active'], false],
          3,
          ['boolean', ['feature-state', 'hover'], false],
          2.3,
          1.2,
        ],
        'circle-opacity': 0.94,
      },
    })
  }

  if (!map.getLayer(APARTMENTS_LABEL_LAYER_ID)) {
    map.addLayer({
      id: APARTMENTS_LABEL_LAYER_ID,
      type: 'symbol',
      source: APARTMENTS_SOURCE_ID,
      layout: {
        'text-field': [
          'concat',
          '#',
          ['to-string', ['get', 'rank_position']],
          ' ',
          '$',
          ['to-string', ['get', 'monthly_price_usd']],
        ],
        'text-size': 10,
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2.35],
        'text-anchor': 'top',
        'text-max-width': 12,
      },
      paint: {
        'text-color': '#fffdf9',
        'text-halo-color': '#171512',
        'text-halo-width': 2.4,
      },
    })
  }
}

function setMapData(map, apartments, amenities) {
  map.getSource(APARTMENTS_SOURCE_ID)?.setData(apartments)
  map.getSource(AMENITIES_SOURCE_ID)?.setData(amenities)
}

function getCollectionBounds(featureCollection) {
  const features = featureCollection?.features ?? []

  if (!features.length) {
    return null
  }

  const bounds = new mapboxgl.LngLatBounds()
  let hasPoint = false

  for (const feature of features) {
    if (feature?.geometry?.type !== 'Point') {
      continue
    }

    const [lng, lat] = feature.geometry.coordinates ?? []

    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      bounds.extend([lng, lat])
      hasPoint = true
    }
  }

  return hasPoint ? bounds : null
}

function MapView({
  token,
  mapStyle,
  apartments,
  amenities,
  activeApartment,
  onSelectApartment,
  onViewUpdate,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const onSelectApartmentRef = useRef(onSelectApartment)
  const onViewUpdateRef = useRef(onViewUpdate)
  const apartmentsRef = useRef(apartments)
  const amenitiesRef = useRef(amenities)
  const activeApartmentRef = useRef(activeApartment)
  const hoveredApartmentIdRef = useRef(null)
  const activeApartmentIdRef = useRef(null)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    onSelectApartmentRef.current = onSelectApartment
  }, [onSelectApartment])

  useEffect(() => {
    onViewUpdateRef.current = onViewUpdate
  }, [onViewUpdate])

  useEffect(() => {
    apartmentsRef.current = apartments
  }, [apartments])

  useEffect(() => {
    amenitiesRef.current = amenities
  }, [amenities])

  useEffect(() => {
    activeApartmentRef.current = activeApartment
  }, [activeApartment])

  useEffect(() => {
    if (!token || !mapContainerRef.current) {
      return
    }

    mapboxgl.accessToken = token
    const initialActiveApartment = activeApartmentRef.current

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: initialActiveApartment?.geometry?.coordinates ?? DEFAULT_CENTER,
      zoom: initialActiveApartment ? 13.8 : DEFAULT_ZOOM,
      pitch: 52,
      bearing: -18,
      antialias: true,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

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
      const initialApartments = apartmentsRef.current
      const initialAmenities = amenitiesRef.current
      const activeApartmentAtLoad = activeApartmentRef.current

      map.setFog({
        color: 'rgb(10, 23, 41)',
        'high-color': 'rgb(69, 108, 183)',
        'horizon-blend': 0.18,
        'space-color': 'rgb(5, 10, 18)',
        'star-intensity': 0.08,
      })

      ensureSourcesAndLayers(map)
      setMapData(map, initialApartments, initialAmenities)
      map.resize()

      if (activeApartmentAtLoad?.id) {
        map.setFeatureState(
          { source: APARTMENTS_SOURCE_ID, id: activeApartmentAtLoad.id },
          { active: true },
        )
        activeApartmentIdRef.current = activeApartmentAtLoad.id
      }

      map.on('mousemove', APARTMENTS_LAYER_ID, (event) => {
        const hoveredFeature = event.features?.[0]
        const nextHoveredId = hoveredFeature?.id

        if (hoveredApartmentIdRef.current && hoveredApartmentIdRef.current !== nextHoveredId) {
          map.setFeatureState(
            { source: APARTMENTS_SOURCE_ID, id: hoveredApartmentIdRef.current },
            { hover: false },
          )
        }

        if (nextHoveredId) {
          hoveredApartmentIdRef.current = nextHoveredId
          map.setFeatureState({ source: APARTMENTS_SOURCE_ID, id: nextHoveredId }, { hover: true })
        }

        map.getCanvas().style.cursor = hoveredFeature ? 'pointer' : ''
      })

      map.on('mouseleave', APARTMENTS_LAYER_ID, () => {
        if (hoveredApartmentIdRef.current) {
          map.setFeatureState(
            { source: APARTMENTS_SOURCE_ID, id: hoveredApartmentIdRef.current },
            { hover: false },
          )
        }

        hoveredApartmentIdRef.current = null
        map.getCanvas().style.cursor = ''
      })

      map.on('click', APARTMENTS_LAYER_ID, (event) => {
        const selectedFeature = event.features?.[0]

        if (!selectedFeature?.id) {
          return
        }

        onSelectApartmentRef.current(selectedFeature.id)
      })

      map.on('click', AMENITIES_LAYER_ID, (event) => {
        const amenityFeature = event.features?.[0]

        if (!amenityFeature) {
          return
        }

        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({ offset: 12 })
          .setLngLat(event.lngLat)
          .setHTML(
            popupMarkup(amenityFeature.properties?.name ?? 'Amenity', [
              amenityFeature.properties?.category_label,
              amenityFeature.properties?.raw_type,
            ]),
          )
          .addTo(map)
      })
    })

    map.on('error', () => {
      setMapError('Map failed to load. Verify your Mapbox token and network connection.')
    })

    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
      hoveredApartmentIdRef.current = null
      activeApartmentIdRef.current = null
    }
  }, [token, mapStyle])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const handleResize = () => {
      mapRef.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) {
      return
    }

    ensureSourcesAndLayers(mapRef.current)
    setMapData(mapRef.current, apartments, amenities)
  }, [apartments, amenities])

  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) {
      return
    }

    if (activeApartmentIdRef.current) {
      mapRef.current.setFeatureState(
        { source: APARTMENTS_SOURCE_ID, id: activeApartmentIdRef.current },
        { active: false },
      )
    }

    if (activeApartment?.id) {
      mapRef.current.setFeatureState(
        { source: APARTMENTS_SOURCE_ID, id: activeApartment.id },
        { active: true },
      )
      activeApartmentIdRef.current = activeApartment.id
    } else {
      activeApartmentIdRef.current = null
    }
  }, [activeApartment])

  useEffect(() => {
    if (!activeApartment || !mapRef.current?.isStyleLoaded()) {
      return
    }

    mapRef.current.flyTo({
      center: activeApartment.geometry.coordinates,
      zoom: 15.2,
      pitch: 60,
      bearing: -20,
      duration: 900,
      essential: true,
    })
  }, [activeApartment])

  useEffect(() => {
    if (!activeApartment || !mapRef.current?.isStyleLoaded()) {
      return
    }

    popupRef.current?.remove()
    popupRef.current = new mapboxgl.Popup({ offset: 16 })
      .setLngLat(activeApartment.geometry.coordinates)
      .setHTML(
        popupMarkup(activeApartment.properties.formatted_address, buildApartmentPopupLines(activeApartment.properties)),
      )
      .addTo(mapRef.current)
  }, [activeApartment])

  const resetToOverview = () => {
    if (!mapRef.current) {
      return
    }

    const bounds = getCollectionBounds(apartments)

    if (bounds) {
      mapRef.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 14,
        duration: 900,
      })
      return
    }

    mapRef.current.easeTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 48,
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
      center: activeApartment?.geometry.coordinates ?? DEFAULT_CENTER,
      zoom: activeApartment ? 16.1 : 13.2,
      pitch: 68,
      bearing: -32,
      duration: 900,
    })
  }

  return (
    <section className="map-panel">
      <header className="map-header glass-card">
        <div>
          <p className="label">Nook</p>
          <h1>Neighborhood Fit Explorer</h1>
        </div>
        <div className="map-actions">
          <button type="button" onClick={resetToOverview}>
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
        Tip: larger markers indicate stronger matches. Click a listing or amenity for details.
      </p>

      {mapError ? <p className="map-error glass-card">{mapError}</p> : null}
      <div ref={mapContainerRef} className="map-canvas" />
    </section>
  )
}

export default MapView
