import { serviceCategoryMap } from '../data/serviceCategories'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]
const CACHE_TTL_MS = 1000 * 60 * 5
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const responseCache = new Map()
const groceryShopValues = new Set([
  'supermarket',
  'grocery',
  'convenience',
  'greengrocer',
  'health_food',
  'organic',
  'farm',
  'deli',
  'frozen_food',
  'food',
  'wholesale',
])
const groceryAmenityValues = new Set(['marketplace'])
const groceryNamePatterns = [
  /\bmarket\b/i,
  /\bgrocery\b/i,
  /\bfoods?\b/i,
  /\bmart\b/i,
  /\bfresh\b/i,
]
const cafeAmenityValues = new Set(['cafe', 'ice_cream'])
const cafeShopValues = new Set(['coffee', 'bakery', 'pastry'])
const cafeCuisineValues = new Set(['coffee_shop', 'dessert', 'ice_cream'])
const cafeNamePatterns = [
  /\bcoffee\b/i,
  /\bcafe\b/i,
  /\bespresso\b/i,
  /\broasters?\b/i,
  /\bbakery\b/i,
  /\bboba\b/i,
  /\btea\b/i,
]

const queryFragmentsByCategory = {
  groceries: [
    'nwr(around:$RADIUS,$LAT,$LON)["shop"~"supermarket|grocery|convenience|greengrocer|health_food|organic|farm|deli|frozen_food|food|wholesale"];',
    'nwr(around:$RADIUS,$LAT,$LON)["amenity"="marketplace"];',
    'nwr(around:$RADIUS,$LAT,$LON)["name"~"market|grocery|foods?|mart|fresh",i];',
  ],
  parks: [
    'nwr(around:$RADIUS,$LAT,$LON)["leisure"="park"];',
    'nwr(around:$RADIUS,$LAT,$LON)["boundary"="national_park"];',
  ],
  gyms: [
    'nwr(around:$RADIUS,$LAT,$LON)["leisure"="fitness_centre"];',
    'nwr(around:$RADIUS,$LAT,$LON)["amenity"="gym"];',
  ],
  cafes: [
    'nwr(around:$RADIUS,$LAT,$LON)["amenity"~"cafe|ice_cream"];',
    'nwr(around:$RADIUS,$LAT,$LON)["shop"~"coffee|bakery|pastry"];',
    'nwr(around:$RADIUS,$LAT,$LON)["cuisine"~"coffee_shop|dessert|ice_cream"];',
    'nwr(around:$RADIUS,$LAT,$LON)["name"~"coffee|cafe|espresso|roasters?|bakery|boba|tea",i];',
  ],
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function normalizeQueryFragment(fragment, center, radiusMeters) {
  return fragment
    .replaceAll('$LAT', String(center[1]))
    .replaceAll('$LON', String(center[0]))
    .replaceAll('$RADIUS', String(Math.round(radiusMeters)))
}

function buildOverpassQuery(center, radiusMeters, categoryIds) {
  const fragments = categoryIds.flatMap(
    (categoryId) => queryFragmentsByCategory[categoryId] ?? [],
  )

  return `
[out:json][timeout:25];
(
${fragments.map((fragment) => `  ${normalizeQueryFragment(fragment, center, radiusMeters)}`).join('\n')}
);
out center tags;
  `.trim()
}

function createCacheKey(center, radiusMeters, categoryIds) {
  return JSON.stringify({
    center: center.map((value) => Number(value).toFixed(4)),
    radiusMeters: Math.round(radiusMeters),
    categoryIds: [...categoryIds].sort(),
  })
}

function getCachedResponse(cacheKey) {
  const cachedEntry = responseCache.get(cacheKey)

  if (!cachedEntry) {
    return null
  }

  if (Date.now() - cachedEntry.createdAt > CACHE_TTL_MS) {
    responseCache.delete(cacheKey)
    return null
  }

  return cachedEntry.data
}

function setCachedResponse(cacheKey, data) {
  responseCache.set(cacheKey, {
    createdAt: Date.now(),
    data,
  })
}

function matchesAnyPattern(value, patterns) {
  if (!value) {
    return false
  }

  return patterns.some((pattern) => pattern.test(value))
}

function getCategoryIdFromTags(tags = {}) {
  const name = tags.name ?? ''
  const brand = tags.brand ?? ''
  const cuisine = tags.cuisine ?? ''

  if (
    groceryShopValues.has(tags.shop) ||
    groceryAmenityValues.has(tags.amenity) ||
    matchesAnyPattern(name, groceryNamePatterns) ||
    matchesAnyPattern(brand, groceryNamePatterns)
  ) {
    return 'groceries'
  }

  if (tags.leisure === 'park' || tags.boundary === 'national_park') {
    return 'parks'
  }

  if (tags.leisure === 'fitness_centre' || tags.amenity === 'gym') {
    return 'gyms'
  }

  if (
    cafeAmenityValues.has(tags.amenity) ||
    cafeShopValues.has(tags.shop) ||
    cafeCuisineValues.has(cuisine) ||
    matchesAnyPattern(name, cafeNamePatterns) ||
    matchesAnyPattern(brand, cafeNamePatterns)
  ) {
    return 'cafes'
  }

  return null
}

function getCoordinates(element) {
  if (typeof element.lon === 'number' && typeof element.lat === 'number') {
    return [element.lon, element.lat]
  }

  if (
    element.center &&
    typeof element.center.lon === 'number' &&
    typeof element.center.lat === 'number'
  ) {
    return [element.center.lon, element.center.lat]
  }

  return null
}

function normalizeElement(element) {
  const categoryId = getCategoryIdFromTags(element.tags)
  const coordinates = getCoordinates(element)

  if (!categoryId || !coordinates || !serviceCategoryMap[categoryId]) {
    return null
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties: {
      id: `${element.type}-${element.id}`,
      categoryId,
      categoryLabel: serviceCategoryMap[categoryId].label,
      color: serviceCategoryMap[categoryId].color,
      name: element.tags?.name ?? serviceCategoryMap[categoryId].label,
      rawType:
        element.tags?.amenity ?? element.tags?.shop ?? element.tags?.leisure ?? 'poi',
      osmType: element.type,
    },
  }
}

async function fetchFromEndpoint(endpoint, query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: query,
  })

  if (!response.ok) {
    const error = new Error(
      `Overpass request failed with status ${response.status} on ${new URL(endpoint).host}.`,
    )
    error.status = response.status
    throw error
  }

  return response.json()
}

function normalizePayload(payload) {
  const uniqueFeatures = new Map()

  for (const element of payload.elements ?? []) {
    const normalizedFeature = normalizeElement(element)

    if (normalizedFeature) {
      uniqueFeatures.set(normalizedFeature.properties.id, normalizedFeature)
    }
  }

  return Array.from(uniqueFeatures.values())
}

export async function fetchPoisForArea({ center, radiusMeters, categoryIds }) {
  if (!categoryIds.length) {
    return []
  }

  const cacheKey = createCacheKey(center, radiusMeters, categoryIds)
  const cachedResponse = getCachedResponse(cacheKey)

  if (cachedResponse) {
    return cachedResponse
  }

  const query = buildOverpassQuery(center, radiusMeters, categoryIds)
  const errors = []

  for (const [index, endpoint] of OVERPASS_ENDPOINTS.entries()) {
    try {
      const payload = await fetchFromEndpoint(endpoint, query)
      const normalizedFeatures = normalizePayload(payload)

      setCachedResponse(cacheKey, normalizedFeatures)
      return normalizedFeatures
    } catch (error) {
      errors.push(error)

      const status = error?.status
      const shouldRetry =
        status == null || RETRYABLE_STATUS_CODES.has(status)

      if (!shouldRetry || index === OVERPASS_ENDPOINTS.length - 1) {
        continue
      }

      await wait(500 + index * 600)
    }
  }

  const statusSummary = errors
    .map((error) => error?.status)
    .filter(Boolean)
    .join(', ')

  throw new Error(
    statusSummary
      ? `Overpass is busy right now (${statusSummary}). Try again in a moment or reduce the search radius.`
      : 'Overpass is unavailable right now. Try again in a moment.',
  )
}
