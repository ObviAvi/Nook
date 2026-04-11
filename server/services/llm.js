import { GoogleGenAI } from '@google/genai'
import { CATEGORY_KEYS, sanitizeCategoryWeights } from '../config/categories.js'
import { clamp01 } from '../lib/geo.js'

const SYSTEM_PROMPT = [
  'You are a real estate preference extraction agent.',
  'Extract only what the user explicitly asks for.',
  'Return strict JSON matching the schema.',
  'Hard constraints belong in constraints.',
  'Lifestyle preferences belong in category_weights with values between 0 and 1.',
  'Use higher weights for urgent language like must, absolute, non-negotiable.',
  'Use OSM-ready category keys exactly as provided by the schema.',
].join(' ')

const CATEGORY_WEIGHT_PROPERTIES = Object.fromEntries(
  CATEGORY_KEYS.map((categoryKey) => [
    categoryKey,
    {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  ]),
)

const PREFERENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['constraints', 'category_weights'],
  properties: {
    constraints: {
      type: 'object',
      additionalProperties: false,
      required: ['max_price_usd', 'min_bedrooms', 'city_target'],
      properties: {
        max_price_usd: {
          type: 'integer',
          minimum: 600,
          maximum: 15000,
        },
        min_bedrooms: {
          type: 'integer',
          minimum: 0,
          maximum: 8,
        },
        city_target: {
          type: 'string',
          minLength: 2,
          maxLength: 120,
        },
      },
    },
    category_weights: {
      type: 'object',
      additionalProperties: false,
      required: CATEGORY_KEYS,
      properties: CATEGORY_WEIGHT_PROPERTIES,
    },
  },
}

function sanitizePreferenceShape(rawPreferences) {
  const maxPrice = Math.max(600, Math.round(Number(rawPreferences?.constraints?.max_price_usd ?? 2500)))
  const minBedrooms = Math.max(0, Math.round(Number(rawPreferences?.constraints?.min_bedrooms ?? 1)))
  const cityTarget = String(rawPreferences?.constraints?.city_target ?? 'Seattle').trim() || 'Seattle'

  const sanitizedWeights = sanitizeCategoryWeights(rawPreferences?.category_weights)
  const hasAnyWeight = Object.values(sanitizedWeights).some((value) => value > 0)

  if (!hasAnyWeight) {
    sanitizedWeights.school = 1
  }

  return {
    constraints: {
      max_price_usd: maxPrice,
      min_bedrooms: minBedrooms,
      city_target: cityTarget,
    },
    category_weights: Object.fromEntries(
      Object.entries(sanitizedWeights).map(([key, value]) => [key, clamp01(value)]),
    ),
  }
}

function parseJsonContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM response did not include structured content.')
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('LLM response was not valid JSON.')
  }
}

export async function extractUserPreferences({ userPrompt }) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to your environment before running searches.')
  }

  const ai = new GoogleGenAI({ apiKey })

  let response

  try {
    response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview',
      contents: `${SYSTEM_PROMPT}\n\nUser prompt:\n${userPrompt}\n\nReturn JSON only.`,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: PREFERENCE_SCHEMA,
      },
    })
  } catch (error) {
    throw new Error(
      `Preference extraction failed: ${
        error instanceof Error ? error.message : 'Unknown Gemini error.'
      }`,
    )
  }

  const parsedPreferences = parseJsonContent(response?.text)

  return sanitizePreferenceShape(parsedPreferences)
}
