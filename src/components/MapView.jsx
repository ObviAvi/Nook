import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const APARTMENTS_SOURCE_ID = 'apartments-source'
const AMENITIES_SOURCE_ID = 'amenities-source'
const APARTMENTS_LAYER_ID = 'apartments-layer'
const APARTMENTS_LABEL_LAYER_ID = 'apartments-label-layer'
const AMENITIES_LAYER_ID = 'amenities-layer'

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
        'circle-color': ['coalesce', ['get', 'color'], '#0ea5e9'],
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
        'text-offset': [0, 1.4],
      },
      paint: {
        'text-color': '#f8fafc',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1,
      },
    })
  }
}

function setMapData(map, apartments, amenities) {
  map.getSource(APARTMENTS_SOURCE_ID)?.setData(apartments)
  map.getSource(AMENITIES_SOURCE_ID)?.setData(amenities)
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
    if (!token || !mapContainerRef.current) {
      return
    }

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: activeApartment?.geometry?.coordinates ?? [-122.334, 47.61],
      zoom: activeApartment ? 13.8 : 11.5,
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
      ensureSourcesAndLayers(map)
      setMapData(map, apartments, amenities)

      if (activeApartment?.id) {
        map.setFeatureState(
          { source: APARTMENTS_SOURCE_ID, id: activeApartment.id },
          { active: true },
        )
        activeApartmentIdRef.current = activeApartment.id

        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({ offset: 16 })
          .setLngLat(activeApartment.geometry.coordinates)
          .setHTML(
            popupMarkup(activeApartment.properties.formatted_address, [
              `Rank #${activeApartment.properties.rank_position}`,
              `${Math.round(activeApartment.properties.final_normalized_score * 100)}% match`,
              `$${Number(activeApartment.properties.monthly_price_usd).toLocaleString()}/month`,
            ]),
          )
          .addTo(map)
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

    popupRef.current?.remove()
    popupRef.current = new mapboxgl.Popup({ offset: 16 })
      .setLngLat(activeApartment.geometry.coordinates)
      .setHTML(
        popupMarkup(activeApartment.properties.formatted_address, [
          `Rank #${activeApartment.properties.rank_position}`,
          `${Math.round(activeApartment.properties.final_normalized_score * 100)}% match`,
          `$${Number(activeApartment.properties.monthly_price_usd).toLocaleString()}/month`,
          `${activeApartment.properties.bedrooms} bd / ${activeApartment.properties.bathrooms} ba`,
        ]),
      )
      .addTo(mapRef.current)
  }, [activeApartment])

  return (
    <section className="map-panel glass-card">
      <header className="map-header">
        <div>
          <p className="label">Agentic Map</p>
          <h1>Nook Ranking Surface</h1>
        </div>
        <p className="gesture-hint">Hover for feature-state highlight. Click to inspect ranked rationale.</p>
      </header>
      {mapError ? <p className="map-error">{mapError}</p> : null}
      <div ref={mapContainerRef} className="map-canvas" />
    </section>
  )
}

export default MapView
