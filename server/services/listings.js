import { createHash } from 'node:crypto'
import { mockListings } from '../data/mockListings.js'

const RENTCAST_ENDPOINT = 'https://api.rentcast.io/v1/listings/rental/long-term'

function normalizeCity(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function createListingId({ formattedAddress, longitude, latitude }) {
  const hash = createHash('sha256')
    .update(`${formattedAddress}|${longitude.toFixed(6)}|${latitude.toFixed(6)}`)
    .digest('hex')
    .slice(0, 14)

  return `apt_${hash}`
}

function normalizeListingRecord(record, sourceLabel) {
  const longitude = Number(record.longitude ?? record.lon)
  const latitude = Number(record.latitude ?? record.lat)
  const monthlyPriceUsd = Number(
    record.monthly_price_usd ?? record.price ?? record.rent ?? record.monthlyRent,
  )
  const bedrooms = Number(record.bedrooms ?? record.beds ?? 0)
  const bathrooms = Number(record.bathrooms ?? record.baths ?? 1)
  const sqft = Number(record.sqft ?? record.squareFootage ?? 0)

  if (
    Number.isNaN(longitude) ||
    Number.isNaN(latitude) ||
    Number.isNaN(monthlyPriceUsd) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null
  }

  const formattedAddress =
    String(
      record.formatted_address ??
        record.formattedAddress ??
        [record.addressLine1, record.city, record.state].filter(Boolean).join(', '),
    ).trim() || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

  const city = String(record.city ?? '').trim() || 'Unknown'
  const neighborhood = String(record.neighborhood ?? record.subdivision ?? city).trim() || city

  return {
    id: createListingId({
      formattedAddress,
      longitude,
      latitude,
    }),
    formatted_address: formattedAddress,
    city,
    neighborhood,
    state: String(record.state ?? '').trim(),
    latitude,
    longitude,
    monthly_price_usd: Math.round(monthlyPriceUsd),
    bedrooms: Math.max(0, Math.round(bedrooms)),
    bathrooms: Math.max(0, Math.round(bathrooms * 10) / 10),
    sqft: Math.max(0, Math.round(sqft)),
    source: sourceLabel,
  }
}

function filterListingsByConstraints(listings, constraints) {
  const targetCity = normalizeCity(constraints.city_target)

  return listings.filter((listing) => {
    const cityMatches = !targetCity || normalizeCity(listing.city).includes(targetCity)

    return (
      cityMatches &&
      listing.monthly_price_usd <= constraints.max_price_usd &&
      listing.bedrooms >= constraints.min_bedrooms
    )
  })
}

async function fetchRentCastListings(constraints) {
  const rentCastApiKey = process.env.RENTCAST_API_KEY

  if (!rentCastApiKey) {
    return null
  }

  const params = new URLSearchParams({
    city: constraints.city_target,
    limit: '80',
    maxRent: String(constraints.max_price_usd),
    minBeds: String(constraints.min_bedrooms),
  })

  const response = await fetch(`${RENTCAST_ENDPOINT}?${params.toString()}`, {
    headers: {
      'X-Api-Key': rentCastApiKey,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`RentCast fetch failed (${response.status}).`)
  }

  const payload = await response.json()
  const rawListings = Array.isArray(payload) ? payload : payload?.data ?? []

  return rawListings
    .map((record) => normalizeListingRecord(record, 'rentcast'))
    .filter(Boolean)
}

function fetchMockListings(constraints) {
  const normalizedMockListings = mockListings
    .map((listing) => normalizeListingRecord(listing, 'mock'))
    .filter(Boolean)

  const filteredMockListings = filterListingsByConstraints(normalizedMockListings, constraints)

  if (filteredMockListings.length > 0) {
    return filteredMockListings
  }

  // Keep the MVP resilient when strict filters produce zero records.
  return normalizedMockListings
}

export async function fetchCandidateListings(constraints) {
  return fetchCandidateListingsWithSource(constraints, { source: 'mock' })
}

export async function fetchCandidateListingsWithSource(constraints, options = {}) {
  const requestedSource = options.source === 'rentcast' ? 'rentcast' : 'mock'

  if (requestedSource === 'mock') {
    return {
      source: 'mock',
      requestedSource,
      warning: '',
      listings: fetchMockListings(constraints),
    }
  }

  try {
    const rentCastListings = await fetchRentCastListings(constraints)

    if (rentCastListings && rentCastListings.length > 0) {
      return {
        source: 'rentcast',
        requestedSource,
        warning: '',
        listings: rentCastListings,
      }
    }

    return {
      source: 'mock-fallback',
      requestedSource,
      warning: process.env.RENTCAST_API_KEY
        ? 'RentCast returned no listings for these constraints. Falling back to mock listings.'
        : 'RENTCAST_API_KEY missing. Falling back to mock listings.',
      listings: fetchMockListings(constraints),
    }
  } catch (error) {
    return {
      source: 'mock-fallback',
      requestedSource,
      warning:
        error instanceof Error
          ? `${error.message} Falling back to mock listings.`
          : 'RentCast unavailable. Falling back to mock listings.',
      listings: fetchMockListings(constraints),
    }
  }
}
