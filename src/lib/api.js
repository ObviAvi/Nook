export async function runPreferenceSearch({ userPrompt, listingSource = 'mock' }) {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userPrompt, listingSource }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Search request failed.')
  }

  return payload
}
