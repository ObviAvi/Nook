const EARTH_RADIUS_METERS = 6371000

function toRadians(value) {
  return (value * Math.PI) / 180
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

export function distanceMeters([lngA, latA], [lngB, latB]) {
  const latitudeDelta = toRadians(latB - latA)
  const longitudeDelta = toRadians(lngB - lngA)
  const latitudeA = toRadians(latA)
  const latitudeB = toRadians(latB)

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2)

  return (
    2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

export function minMaxNormalize(values) {
  if (!values.length) {
    return []
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (maxValue === minValue) {
    return values.map(() => 1)
  }

  return values.map((value) => (value - minValue) / (maxValue - minValue))
}

export function buildBoundingBoxFromListings(listings, paddingMeters = 2200) {
  if (!listings.length) {
    return null
  }

  const latitudes = listings.map((listing) => listing.latitude)
  const longitudes = listings.map((listing) => listing.longitude)

  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)

  const centerLat = (minLat + maxLat) / 2
  const latPadding = paddingMeters / 111320
  const lonPadding = paddingMeters / (111320 * Math.max(Math.cos(toRadians(centerLat)), 0.2))

  return {
    south: minLat - latPadding,
    west: minLon - lonPadding,
    north: maxLat + latPadding,
    east: maxLon + lonPadding,
  }
}

export function toOverpassBboxString(bbox) {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
}

export function getElementCoordinates(element) {
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
