const DEFAULT_IMPORTANCE = 0.65
const DEFAULT_PRICE_IMPORTANCE = 0.8

export function buildDefaultCategoryImportance(categories) {
  return Object.fromEntries(
    categories.map((category) => [category.id, DEFAULT_IMPORTANCE]),
  )
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

export function normalizeWeightMap(weightMap, allowedKeys) {
  const sanitizedEntries = allowedKeys.map((key) => [
    key,
    clamp01(Number(weightMap[key] ?? 0)),
  ])
  const totalWeight = sanitizedEntries.reduce(
    (sum, [, value]) => sum + value,
    0,
  )

  if (totalWeight <= 0) {
    const fallbackWeight = allowedKeys.length ? 1 / allowedKeys.length : 0
    return Object.fromEntries(
      allowedKeys.map((key) => [key, fallbackWeight]),
    )
  }

  return Object.fromEntries(
    sanitizedEntries.map(([key, value]) => [key, value / totalWeight]),
  )
}

export function normalizeUserPreferences({
  selectedCategoryIds,
  categoryImportance,
  priceImportance,
}) {
  const normalizedSelectedCategories = normalizeWeightMap(
    categoryImportance,
    selectedCategoryIds,
  )
  const normalizedPriceImportance = clamp01(Number(priceImportance ?? 0))
  const categoryTotal = Object.values(normalizedSelectedCategories).reduce(
    (sum, value) => sum + value,
    0,
  )
  const combinedTotal = categoryTotal + normalizedPriceImportance

  if (combinedTotal <= 0) {
    return {
      categoryWeights: normalizedSelectedCategories,
      priceWeight: 0,
    }
  }

  return {
    categoryWeights: Object.fromEntries(
      Object.entries(normalizedSelectedCategories).map(([key, value]) => [
        key,
        value / combinedTotal,
      ]),
    ),
    priceWeight: normalizedPriceImportance / combinedTotal,
  }
}

function calculateCategoryAccess(listingCoordinates, poiFeatures, categoryId, matchRadiusMeters, distanceMeters) {
  let nearbyCount = 0
  let accessScore = 0
  let closestDistance = Number.POSITIVE_INFINITY

  for (const poiFeature of poiFeatures) {
    if (poiFeature.properties.categoryId !== categoryId) {
      continue
    }

    const poiDistance = distanceMeters(
      listingCoordinates,
      poiFeature.geometry.coordinates,
    )

    if (poiDistance > matchRadiusMeters) {
      continue
    }

    nearbyCount += 1
    closestDistance = Math.min(closestDistance, poiDistance)
    accessScore += Math.max(0, 1 - poiDistance / matchRadiusMeters)
  }

  return {
    nearbyCount,
    closestDistance:
      closestDistance === Number.POSITIVE_INFINITY
        ? null
        : Math.round(closestDistance),
    rawScore: accessScore,
  }
}

function normalizeMetricMap(metricMap) {
  const values = Object.values(metricMap)

  if (!values.length) {
    return {}
  }

  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)

  if (maxValue === minValue) {
    return Object.fromEntries(
      Object.keys(metricMap).map((key) => [key, maxValue > 0 ? 1 : 0]),
    )
  }

  return Object.fromEntries(
    Object.entries(metricMap).map(([key, value]) => [
      key,
      (value - minValue) / (maxValue - minValue),
    ]),
  )
}

function buildPriceScore(monthlyRent, preferredMonthlyRent, cheapestRent, priciestRent) {
  const fallbackRange = Math.max(preferredMonthlyRent * 0.35, 250)
  const marketRange = Math.max(priciestRent - cheapestRent, fallbackRange)

  if (monthlyRent <= preferredMonthlyRent) {
    const bonusRange = Math.max(preferredMonthlyRent - cheapestRent, fallbackRange)
    return clamp01(0.75 + (preferredMonthlyRent - monthlyRent) / bonusRange / 4)
  }

  return clamp01(1 - (monthlyRent - preferredMonthlyRent) / marketRange)
}

export function rankListingsWithPreferences({
  listings,
  poiFeatures,
  selectedCategoryIds,
  userPreferences,
  preferredMonthlyRent,
  matchRadiusMeters,
  distanceMeters,
}) {
  const categoryMetricsByListing = new Map()

  for (const listing of listings) {
    const metricsByCategory = Object.fromEntries(
      selectedCategoryIds.map((categoryId) => [
        categoryId,
        calculateCategoryAccess(
          listing.geometry.coordinates,
          poiFeatures,
          categoryId,
          matchRadiusMeters,
          distanceMeters,
        ),
      ]),
    )

    categoryMetricsByListing.set(listing.properties.id, metricsByCategory)
  }

  const normalizedCategoryScores = Object.fromEntries(
    selectedCategoryIds.map((categoryId) => {
      const rawScoresByListing = Object.fromEntries(
        listings.map((listing) => [
          listing.properties.id,
          categoryMetricsByListing.get(listing.properties.id)[categoryId].rawScore,
        ]),
      )

      return [categoryId, normalizeMetricMap(rawScoresByListing)]
    }),
  )

  const cheapestRent = Math.min(
    ...listings.map((listing) => listing.properties.monthlyRent),
  )
  const priciestRent = Math.max(
    ...listings.map((listing) => listing.properties.monthlyRent),
  )

  const rankedListings = listings
    .map((listing) => {
      const categoryMetrics = categoryMetricsByListing.get(listing.properties.id)
      const normalizedCategoryScoresForListing = Object.fromEntries(
        selectedCategoryIds.map((categoryId) => [
          categoryId,
          normalizedCategoryScores[categoryId]?.[listing.properties.id] ?? 0,
        ]),
      )
      const priceScore = buildPriceScore(
        listing.properties.monthlyRent,
        preferredMonthlyRent,
        cheapestRent,
        priciestRent,
      )

      const weightedCategoryScore = selectedCategoryIds.reduce(
        (sum, categoryId) =>
          sum +
          (userPreferences.categoryWeights[categoryId] ?? 0) *
            normalizedCategoryScoresForListing[categoryId],
        0,
      )
      const weightedPriceScore = userPreferences.priceWeight * priceScore
      const weightedScore = weightedCategoryScore + weightedPriceScore
      const closestPoiDistance = selectedCategoryIds.reduce((closestDistance, categoryId) => {
        const categoryDistance = categoryMetrics[categoryId].closestDistance

        if (categoryDistance == null) {
          return closestDistance
        }

        return Math.min(closestDistance, categoryDistance)
      }, Number.POSITIVE_INFINITY)

      return {
        ...listing,
        properties: {
          ...listing.properties,
          weightedScore,
          weightedScorePercent: Math.round(weightedScore * 100),
          rankLabel: `${Math.round(weightedScore * 100)} / 100 fit score`,
          closestPoiDistance:
            closestPoiDistance === Number.POSITIVE_INFINITY
              ? null
              : Math.round(closestPoiDistance),
          serviceBreakdown: Object.fromEntries(
            selectedCategoryIds.map((categoryId) => [
              categoryId,
              categoryMetrics[categoryId].nearbyCount,
            ]),
          ),
          serviceScoreBreakdown: normalizedCategoryScoresForListing,
          weightedContributionBreakdown: Object.fromEntries(
            selectedCategoryIds.map((categoryId) => [
              categoryId,
              (userPreferences.categoryWeights[categoryId] ?? 0) *
                normalizedCategoryScoresForListing[categoryId],
            ]),
          ),
          priceScore,
          priceContribution: weightedPriceScore,
        },
      }
    })
    .sort((listingA, listingB) => {
      if (listingB.properties.weightedScore !== listingA.properties.weightedScore) {
        return listingB.properties.weightedScore - listingA.properties.weightedScore
      }

      return listingA.properties.monthlyRent - listingB.properties.monthlyRent
    })
    .map((listing, index) => ({
      ...listing,
      properties: {
        ...listing.properties,
        rank: index + 1,
      },
    }))

  return rankedListings
}

export function createRankedApartmentMap(listings) {
  return Object.fromEntries(
    listings.map((listing, index) => [
      index,
      {
        id: listing.properties.id,
        title: listing.properties.title,
        lat: listing.geometry.coordinates[1],
        lon: listing.geometry.coordinates[0],
        score: Number(listing.properties.weightedScore.toFixed(4)),
        monthlyRent: listing.properties.monthlyRent,
      },
    ]),
  )
}

export const defaultRankingPreferences = {
  priceImportance: DEFAULT_PRICE_IMPORTANCE,
}
