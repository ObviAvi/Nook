import http from 'node:http'
import { CATEGORY_DEFINITIONS, getActiveCategoryKeys } from './config/categories.js'
import { loadServerEnv } from './config/env.js'
import { buildBoundingBoxFromListings } from './lib/geo.js'
import { extractUserPreferences } from './services/llm.js'
import { fetchCandidateListingsWithSource } from './services/listings.js'
import { fetchAmenitiesByCategory } from './services/overpass.js'
import { rankListings } from './services/ranking.js'

loadServerEnv()

const API_PORT = Number(process.env.API_PORT ?? 8787)
const MAX_BODY_BYTES = 1_000_000

function withCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function writeJson(response, statusCode, payload) {
  withCorsHeaders(response)
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let totalBytes = 0

    request.on('data', (chunk) => {
      totalBytes += chunk.length

      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'))
        request.destroy()
        return
      }

      chunks.push(chunk)
    })

    request.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf-8')

        if (!rawBody.trim()) {
          resolve({})
          return
        }

        resolve(JSON.parse(rawBody))
      } catch {
        reject(new Error('Invalid JSON request body.'))
      }
    })

    request.on('error', () => {
      reject(new Error('Unable to read request body.'))
    })
  })
}

function createEmptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}

async function handleSearch(request, response) {
  const body = await parseJsonBody(request)
  const userPrompt = String(body.userPrompt ?? '').trim()
  const listingSource = body.listingSource === 'rentcast' ? 'rentcast' : 'mock'

  if (userPrompt.length < 8) {
    writeJson(response, 400, {
      error: 'Please provide a more descriptive housing prompt.',
    })
    return
  }

  const extractedPreferences = await extractUserPreferences({ userPrompt })
  const listingResult = await fetchCandidateListingsWithSource(
    extractedPreferences.constraints,
    { source: listingSource },
  )

  if (!listingResult.listings.length) {
    writeJson(response, 200, {
      extracted_preferences: extractedPreferences,
      feature_collection: createEmptyFeatureCollection(),
      amenities_feature_collection: createEmptyFeatureCollection(),
      meta: {
        listing_source_requested: listingSource,
        listing_source_used: listingResult.source,
        listing_source: listingResult.source,
        listing_warning: listingResult.warning,
        listing_count: 0,
        amenity_count: 0,
      },
    })
    return
  }

  const boundingBox = buildBoundingBoxFromListings(listingResult.listings)
  const activeCategoryIds = getActiveCategoryKeys(extractedPreferences.category_weights)

  const amenityResult = await fetchAmenitiesByCategory({
    bbox: boundingBox,
    categoryIds: activeCategoryIds,
  })

  const rankingResult = rankListings({
    listings: listingResult.listings,
    amenitiesByCategory: amenityResult.amenitiesByCategory,
    categoryWeights: extractedPreferences.category_weights,
    maxBudgetUsd: extractedPreferences.constraints.max_price_usd,
  })

  writeJson(response, 200, {
    extracted_preferences: extractedPreferences,
    feature_collection: rankingResult.featureCollection,
    amenities_feature_collection: amenityResult.featureCollection,
    meta: {
      listing_source_requested: listingSource,
      listing_source_used: listingResult.source,
      listing_source: listingResult.source,
      listing_warning: listingResult.warning,
      listing_count: rankingResult.featureCollection.features.length,
      amenity_count: amenityResult.featureCollection.features.length,
      categories_used: activeCategoryIds,
      available_categories: Object.fromEntries(
        Object.values(CATEGORY_DEFINITIONS).map((category) => [category.id, category.label]),
      ),
    },
  })
}

const server = http.createServer(async (request, response) => {
  const method = request.method ?? 'GET'
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (method === 'OPTIONS') {
    withCorsHeaders(response)
    response.statusCode = 204
    response.end()
    return
  }

  try {
    if (method === 'GET' && requestUrl.pathname === '/api/health') {
      writeJson(response, 200, {
        ok: true,
        message: 'Nook API ready.',
      })
      return
    }

    if (method === 'POST' && requestUrl.pathname === '/api/search') {
      await handleSearch(request, response)
      return
    }

    writeJson(response, 404, {
      error: 'Endpoint not found.',
    })
  } catch (error) {
    writeJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  }
})

server.listen(API_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Nook API listening on http://localhost:${API_PORT}`)
})
