function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

export const CATEGORY_DEFINITIONS = {
  school: {
    id: 'school',
    label: 'School',
    color: '#0ea5e9',
    overpassFragments: ['nwr["amenity"="school"]({{bbox}});'],
  },
  park: {
    id: 'park',
    label: 'Park',
    color: '#22c55e',
    overpassFragments: [
      'nwr["leisure"="park"]({{bbox}});',
      'nwr["boundary"="national_park"]({{bbox}});',
    ],
  },
  supermarket: {
    id: 'supermarket',
    label: 'Supermarket',
    color: '#f59e0b',
    overpassFragments: [
      'nwr["shop"~"supermarket|grocery|convenience|greengrocer"]({{bbox}});',
      'nwr["amenity"="marketplace"]({{bbox}});',
    ],
  },
  transit: {
    id: 'transit',
    label: 'Transit',
    color: '#a855f7',
    overpassFragments: [
      'nwr["highway"="bus_stop"]({{bbox}});',
      'nwr["railway"~"station|halt|tram_stop|subway_entrance"]({{bbox}});',
      'nwr["public_transport"~"platform|station|stop_position"]({{bbox}});',
    ],
  },
  gym: {
    id: 'gym',
    label: 'Gym',
    color: '#ef4444',
    overpassFragments: [
      'nwr["leisure"="fitness_centre"]({{bbox}});',
      'nwr["amenity"="gym"]({{bbox}});',
    ],
  },
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    color: '#f97316',
    overpassFragments: [
      'nwr["amenity"~"cafe|ice_cream"]({{bbox}});',
      'nwr["shop"~"coffee|bakery|pastry"]({{bbox}});',
    ],
  },
  healthcare: {
    id: 'healthcare',
    label: 'Healthcare',
    color: '#06b6d4',
    overpassFragments: [
      'nwr["amenity"~"hospital|clinic|doctors|pharmacy"]({{bbox}});',
      'nwr["healthcare"]({{bbox}});',
    ],
  },
  nightlife: {
    id: 'nightlife',
    label: 'Nightlife',
    color: '#ec4899',
    overpassFragments: [
      'nwr["amenity"~"bar|pub|nightclub"]({{bbox}});',
      'nwr["amenity"="restaurant"]({{bbox}});',
    ],
  },
}

export const CATEGORY_KEYS = Object.keys(CATEGORY_DEFINITIONS)

export function sanitizeCategoryWeights(rawCategoryWeights = {}) {
  const sanitizedWeights = {}

  for (const categoryKey of CATEGORY_KEYS) {
    sanitizedWeights[categoryKey] = clamp01(Number(rawCategoryWeights[categoryKey] ?? 0))
  }

  return sanitizedWeights
}

export function getActiveCategoryKeys(categoryWeights, minimumWeight = 0.05) {
  return CATEGORY_KEYS.filter((categoryKey) =>
    Number(categoryWeights[categoryKey] ?? 0) >= minimumWeight,
  )
}
