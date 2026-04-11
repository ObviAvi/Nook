import { useCallback, useMemo, useState } from 'react'
import LlmSidebar from './components/LlmSidebar'
import MapView from './components/MapView'
import MetricsSidebar from './components/MetricsSidebar'
import { runPreferenceSearch } from './lib/api'
import './App.css'

const DEFAULT_PROMPT =
  'I need a 2 bedroom apartment under 2500 in Seattle. School and transit are very important. Park access is nice to have.'

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
}

function createChatEntry(role, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    timestamp: new Date().toISOString(),
  }
}

function App() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const [userPrompt, setUserPrompt] = useState(DEFAULT_PROMPT)
  const [chatHistory, setChatHistory] = useState([])
  const [searchResult, setSearchResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [listingSource, setListingSource] = useState('mock')
  const [activeApartmentId, setActiveApartmentId] = useState(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/standard')
  const [viewState, setViewState] = useState({
    lng: -122.334,
    lat: 47.61,
    zoom: 12,
    pitch: 48,
    bearing: -18,
  })
  const apartmentFeatureCollection = searchResult?.feature_collection ?? EMPTY_FEATURE_COLLECTION
  const amenityFeatureCollection =
    searchResult?.amenities_feature_collection ?? EMPTY_FEATURE_COLLECTION

  const apartmentFeatures = useMemo(
    () => apartmentFeatureCollection.features ?? [],
    [apartmentFeatureCollection],
  )

  const activeApartment = useMemo(
    () =>
      apartmentFeatures.find((feature) => feature.id === activeApartmentId) ??
      apartmentFeatures[0] ??
      null,
    [activeApartmentId, apartmentFeatures],
  )

  const submitSearch = useCallback(async (promptText, selectedListingSource = 'mock') => {
    const normalizedPrompt = promptText.trim()

    if (!normalizedPrompt) {
      setSearchError('Enter a prompt before running the LLM service.')
      return
    }

    setIsLoading(true)
    setSearchError('')
    setChatHistory((currentHistory) => [
      ...currentHistory,
      createChatEntry('user', normalizedPrompt),
    ])

    try {
      const nextResult = await runPreferenceSearch({
        userPrompt: normalizedPrompt,
        listingSource: selectedListingSource,
      })

      setSearchResult(nextResult)
      const topRankedFeature = nextResult.feature_collection?.features?.[0] ?? null
      setActiveApartmentId(topRankedFeature?.id ?? null)
      const listingCount = Number(nextResult?.meta?.listing_count ?? 0)
      const sourceUsed =
        nextResult?.meta?.listing_source_used ?? nextResult?.meta?.listing_source ?? 'mock'
      const sourceWarning = String(nextResult?.meta?.listing_warning ?? '').trim()
      const amenityWarning = String(nextResult?.meta?.amenity_warning ?? '').trim()

      setChatHistory((currentHistory) => {
        const nextHistory = [
          ...currentHistory,
          createChatEntry(
            'assistant',
            `Ranked ${listingCount} listing${listingCount === 1 ? '' : 's'} using ${sourceUsed}.`,
          ),
        ]

        if (sourceWarning) {
          nextHistory.push(createChatEntry('assistant', sourceWarning))
        }

        if (amenityWarning) {
          nextHistory.push(createChatEntry('assistant', amenityWarning))
        }

        return nextHistory
      })
    } catch (error) {
      setSearchResult(null)
      setActiveApartmentId(null)
      const errorMessage =
        error instanceof Error ? error.message : 'Search failed unexpectedly.'

      setSearchError(errorMessage)
      setChatHistory((currentHistory) => [
        ...currentHistory,
        createChatEntry('assistant', `Search failed: ${errorMessage}`),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [])

  if (!token) {
    return (
      <main className="token-screen">
        <section className="token-card glass-card">
          <p className="label">Configuration Needed</p>
          <h1>Mapbox Token Missing</h1>
          <p>
            Create <code>.env.local</code> in the project root and add{' '}
            <code>VITE_MAPBOX_TOKEN=your_public_token</code>. Restart the dev
            server after saving.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <LlmSidebar
        userPrompt={userPrompt}
        onPromptChange={setUserPrompt}
        listingSource={listingSource}
        onListingSourceChange={setListingSource}
        onSubmitSearch={() => void submitSearch(userPrompt, listingSource)}
        onResetChat={() => {
          setChatHistory([])
          setUserPrompt(DEFAULT_PROMPT)
          setSearchError('')
        }}
        isLoading={isLoading}
        searchError={searchError}
        chatHistory={chatHistory}
      />
      <MapView
        token={token}
        mapStyle={mapStyle}
        apartments={apartmentFeatureCollection}
        amenities={amenityFeatureCollection}
        activeApartment={activeApartment}
        onSelectApartment={setActiveApartmentId}
        onViewUpdate={setViewState}
      />
      <MetricsSidebar
        searchResult={searchResult}
        listings={apartmentFeatures}
        activeApartment={activeApartment}
        onSelectApartment={setActiveApartmentId}
        viewState={viewState}
        mapStyle={mapStyle}
        onStyleChange={setMapStyle}
      />
    </main>
  )
}

export default App
