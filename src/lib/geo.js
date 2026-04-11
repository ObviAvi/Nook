const EARTH_RADIUS_METERS = 6371000

function toRadians(value) {
  return (value * Math.PI) / 180
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

export function createCircleFeature(center, radiusMeters, steps = 72) {
  const [centerLng, centerLat] = center
  const latitudeRadians = toRadians(centerLat)
  const coordinates = []

  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2
    const deltaLat = (radiusMeters / 111320) * Math.cos(angle)
    const deltaLng =
      (radiusMeters / (111320 * Math.cos(latitudeRadians))) * Math.sin(angle)

    coordinates.push([centerLng + deltaLng, centerLat + deltaLat])
  }

  return {
    type: 'Feature',
    properties: {
      radiusMeters,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  }
}
