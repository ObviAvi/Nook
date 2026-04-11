import { CATEGORY_DEFINITIONS } from '../config/categories.js'
import { getElementCoordinates, toOverpassBboxString } from '../lib/geo.js'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const CACHE_TTL_MS = 1000 * 60 * 5
const overpassCache = new Map()

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function buildCategoryQuery(categoryId, bbox) {
  const categoryDefinition = CATEGORY_DEFINITIONS[categoryId]

  if (!categoryDefinition) {
    return ''
  }

  const bboxString = toOverpassBboxString(bbox)
  const lines = categoryDefinition.overpassFragments.map((fragment) =>
    fragment.replaceAll('{{bbox}}', bboxString),
  )

  return `
[out:json][timeout:25];
(
  ${lines.join('\n  ')}
);
out center tags;
  `.trim()
}

function buildCacheKey(bbox, categoryIds) {
  return JSON.stringify({
    bbox: {
      south: Number(bbox.south.toFixed(4)),
      west: Number(bbox.west.toFixed(4)),
      north: Number(bbox.north.toFixed(4)),
      east: Number(bbox.east.toFixed(4)),
    },
    categories: [...categoryIds].sort(),
  })
}

function getCachedAmenities(cacheKey) {
  const cached = overpassCache.get(cacheKey)

  if (!cached) {
    return null
  }

  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    overpassCache.delete(cacheKey)
    return null
  }

  return cached.payload
}

function setCachedAmenities(cacheKey, payload) {
  overpassCache.set(cacheKey, {
    createdAt: Date.now(),
    payload,
  })
}

async function fetchOverpassPayload(query) {
  const errors = []

  for (const [index, endpoint] of OVERPASS_ENDPOINTS.entries()) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: query,
      })

      if (!response.ok) {
        const error = new Error(`Overpass request failed (${response.status}).`)
        error.status = response.status
        throw error
      }

      return response.json()
    } catch (error) {
      errors.push(error)
      const status = error?.status
      const shouldRetry = status == null || RETRYABLE_STATUS_CODES.has(status)

      if (!shouldRetry || index === OVERPASS_ENDPOINTS.length - 1) {
        continue
      }

      await wait(500 + 600 * index)
    }
  }

  const statusSummary = errors
    .map((error) => error?.status)
    .filter(Boolean)
    .join(', ')

  if (statusSummary) {
    throw new Error(`Overpass is busy (${statusSummary}).`)
  }

  throw new Error('Overpass request failed.')
}

function normalizeAmenityFeature(element, categoryId) {
  const coordinates = getElementCoordinates(element)

  if (!coordinates) {
    return null
  }

  const categoryDefinition = CATEGORY_DEFINITIONS[categoryId]
  const rawType =
    element.tags?.amenity ??
    element.tags?.shop ??
    element.tags?.leisure ??
    element.tags?.public_transport ??
    element.tags?.railway ??
    element.tags?.highway ??
    'poi'

  return {
    type: 'Feature',
    id: `osm-${categoryId}-${element.type}-${element.id}`,
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties: {
      id: `osm-${categoryId}-${element.type}-${element.id}`,
      category_id: categoryId,
      category_label: categoryDefinition.label,
      color: categoryDefinition.color,
      name: String(element.tags?.name ?? categoryDefinition.label),
      raw_type: String(rawType),
      osm_type: String(element.type ?? 'node'),
    },
  }
}

export async function fetchAmenitiesByCategory({ bbox, categoryIds }) {
  const validCategoryIds = categoryIds.filter((categoryId) => CATEGORY_DEFINITIONS[categoryId])

  if (!validCategoryIds.length) {
    return {
      amenitiesByCategory: {},
      featureCollection: {
        type: 'FeatureCollection',
        features: [],
      },
    }
  }

  const cacheKey = buildCacheKey(bbox, validCategoryIds)
  const cachedPayload = getCachedAmenities(cacheKey)

  if (cachedPayload) {
    return cachedPayload
  }

  const amenitiesByCategory = {}
  const allAmenityFeatures = []
  let successfulCategoryQueries = 0

  for (const categoryId of validCategoryIds) {
    try {
      const query = buildCategoryQuery(categoryId, bbox)
      const payload = await fetchOverpassPayload(query)
      const categoryFeatures = (payload.elements ?? [])
        .map((element) => normalizeAmenityFeature(element, categoryId))
        .filter(Boolean)

      amenitiesByCategory[categoryId] = categoryFeatures
      allAmenityFeatures.push(...categoryFeatures)
      successfulCategoryQueries += 1
    } catch {
      amenitiesByCategory[categoryId] = []
    }
  }

  if (successfulCategoryQueries === 0) {
    throw new Error('Unable to load amenities from Overpass for the selected categories.')
  }

  const dedupedFeatures = Array.from(
    new Map(allAmenityFeatures.map((feature) => [feature.id, feature])).values(),
  )

  const payload = {
    amenitiesByCategory,
    featureCollection: {
      type: 'FeatureCollection',
      features: dedupedFeatures,
    },
  }

  setCachedAmenities(cacheKey, payload)
  return payload
}
