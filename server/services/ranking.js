import { getActiveCategoryKeys } from '../config/categories.js'
import { clamp01, distanceMeters, minMaxNormalize } from '../lib/geo.js'

function normalizeActiveCategoryWeights(categoryWeights) {
  const activeCategoryIds = getActiveCategoryKeys(categoryWeights, 0.01)

  if (!activeCategoryIds.length) {
    return {
      activeCategoryIds: [],
      normalizedWeights: {},
    }
  }

  const rawWeightTotal = activeCategoryIds.reduce(
    (sum, categoryId) => sum + Number(categoryWeights[categoryId] ?? 0),
    0,
  )

  if (rawWeightTotal <= 0) {
    const uniformWeight = 1 / activeCategoryIds.length

    return {
      activeCategoryIds,
      normalizedWeights: Object.fromEntries(
        activeCategoryIds.map((categoryId) => [categoryId, uniformWeight]),
      ),
    }
  }

  return {
    activeCategoryIds,
    normalizedWeights: Object.fromEntries(
      activeCategoryIds.map((categoryId) => [
        categoryId,
        Number(categoryWeights[categoryId] ?? 0) / rawWeightTotal,
      ]),
    ),
  }
}

function findNearestDistanceMeters(listingCoordinates, categoryFeatures) {
  if (!categoryFeatures?.length) {
    return null
  }

  let nearestDistance = Number.POSITIVE_INFINITY

  for (const feature of categoryFeatures) {
    const candidateDistance = distanceMeters(listingCoordinates, feature.geometry.coordinates)
    nearestDistance = Math.min(nearestDistance, candidateDistance)
  }

  return Number.isFinite(nearestDistance) ? Math.round(nearestDistance) : null
}

function createCategoryBreakdown(activeCategoryIds, nearestDistancesByCategory) {
  return Object.fromEntries(
    activeCategoryIds.map((categoryId) => [
      `${categoryId}_distance_meters`,
      nearestDistancesByCategory[categoryId],
    ]),
  )
}

function scoreGeoProximity(activeCategoryIds, normalizedWeights, nearestDistancesByCategory, beta) {
  return activeCategoryIds.reduce((sum, categoryId) => {
    const nearestDistance = nearestDistancesByCategory[categoryId]

    if (nearestDistance == null) {
      return sum
    }

    const decayedScore = Math.exp(-beta * nearestDistance)
    return sum + normalizedWeights[categoryId] * decayedScore
  }, 0)
}

function scorePrice({ monthlyPriceUsd, minimumPriceUsd, maxBudgetUsd }) {
  const denominator = Math.max(maxBudgetUsd - minimumPriceUsd, 1)
  return clamp01(1 - (monthlyPriceUsd - minimumPriceUsd) / denominator)
}

export function rankListings({
  listings,
  amenitiesByCategory,
  categoryWeights,
  maxBudgetUsd,
  alpha = 0.72,
  beta = 0.00165,
}) {
  if (!listings.length) {
    return {
      featureCollection: {
        type: 'FeatureCollection',
        features: [],
      },
      normalizedCategoryWeights: {},
    }
  }

  const { activeCategoryIds, normalizedWeights } = normalizeActiveCategoryWeights(categoryWeights)
  const minimumPriceUsd = Math.min(...listings.map((listing) => listing.monthly_price_usd))

  const scoredListings = listings.map((listing) => {
    const listingCoordinates = [listing.longitude, listing.latitude]
    const nearestDistancesByCategory = Object.fromEntries(
      activeCategoryIds.map((categoryId) => [
        categoryId,
        findNearestDistanceMeters(listingCoordinates, amenitiesByCategory[categoryId]),
      ]),
    )

    const geoScore = scoreGeoProximity(
      activeCategoryIds,
      normalizedWeights,
      nearestDistancesByCategory,
      beta,
    )

    const priceScore = scorePrice({
      monthlyPriceUsd: listing.monthly_price_usd,
      minimumPriceUsd,
      maxBudgetUsd: maxBudgetUsd ?? listing.monthly_price_usd,
    })

    const rawScore = alpha * geoScore + (1 - alpha) * priceScore

    return {
      listing,
      geoScore,
      priceScore,
      rawScore,
      nearestDistancesByCategory,
    }
  })

  const normalizedScores = minMaxNormalize(scoredListings.map((entry) => entry.rawScore))

  const rankedEntries = scoredListings
    .map((entry, index) => ({
      ...entry,
      normalizedScore: normalizedScores[index],
    }))
    .sort((left, right) => {
      if (right.normalizedScore !== left.normalizedScore) {
        return right.normalizedScore - left.normalizedScore
      }

      return left.listing.monthly_price_usd - right.listing.monthly_price_usd
    })

  const rankedFeatures = rankedEntries.map((entry, index) => ({
    type: 'Feature',
    id: entry.listing.id,
    geometry: {
      type: 'Point',
      coordinates: [entry.listing.longitude, entry.listing.latitude],
    },
    properties: {
      id: entry.listing.id,
      rank_position: index + 1,
      final_normalized_score: Number(entry.normalizedScore.toFixed(4)),
      raw_score: Number(entry.rawScore.toFixed(4)),
      geo_score: Number(entry.geoScore.toFixed(4)),
      price_score: Number(entry.priceScore.toFixed(4)),
      monthly_price_usd: entry.listing.monthly_price_usd,
      formatted_address: entry.listing.formatted_address,
      city: entry.listing.city,
      neighborhood: entry.listing.neighborhood,
      bedrooms: entry.listing.bedrooms,
      bathrooms: entry.listing.bathrooms,
      sqft: entry.listing.sqft,
      source: entry.listing.source,
      category_breakdown: createCategoryBreakdown(
        activeCategoryIds,
        entry.nearestDistancesByCategory,
      ),
      weight_breakdown: normalizedWeights,
    },
  }))

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features: rankedFeatures,
    },
    normalizedCategoryWeights: normalizedWeights,
  }
}
