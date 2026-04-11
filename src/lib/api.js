function getLocalFallbackApiBase() {
  if (typeof window === 'undefined') {
    return null
  }

  const host = window.location.hostname

  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:8787`
  }

  return null
}

async function postSearch(apiUrl, body) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Search request failed.')
  }

  return payload
}

export async function runPreferenceSearch({ userPrompt, listingSource = 'mock' }) {
  const requestBody = { userPrompt, listingSource }

  try {
    return await postSearch('/api/search', requestBody)
  } catch (error) {
    const canRetryDirect =
      error instanceof TypeError ||
      (error instanceof Error && /Failed to fetch/i.test(error.message))

    if (!canRetryDirect) {
      throw error
    }

    const localFallbackBase = getLocalFallbackApiBase()

    if (!localFallbackBase) {
      throw error
    }

    try {
      return await postSearch(`${localFallbackBase}/api/search`, requestBody)
    } catch {
      throw new Error('Unable to reach the search API. Start both frontend and backend with npm run dev.')
    }
  }
}
