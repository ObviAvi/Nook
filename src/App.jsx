import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { fakeListings } from './data/fakeListings'
import { sampleRegions } from './data/sampleRegions'
import {
  defaultServiceCategoryIds,
  serviceCategories,
} from './data/serviceCategories'
import { distanceMeters } from './lib/geo'
import { fetchPoisForArea } from './lib/overpass'
import {
  buildDefaultCategoryImportance,
  defaultRankingPreferences,
  normalizeUserPreferences,
  rankListingsWithPreferences,
} from './lib/ranking'
import './App.css'

const LISTING_MATCH_RADIUS_METERS = 1200
const DEFAULT_REGION = sampleRegions[0]

function getDefaultPreferredMonthlyRent(listings) {
  const totalRent = listings.reduce(
    (sum, listing) => sum + listing.properties.monthlyRent,
    0,
  )

  return Math.round(totalRent / listings.length)
}

function App() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const [experienceStarted, setExperienceStarted] = useState(false)
  const [landingQuery, setLandingQuery] = useState('')
  const [sidebarMode, setSidebarMode] = useState('setup')
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/standard')
  const [timeOfDayHour, setTimeOfDayHour] = useState(15.25)
  const [selectedRegionId, setSelectedRegionId] = useState(DEFAULT_REGION.id)
  const [searchCenter, setSearchCenter] = useState(DEFAULT_REGION.center)
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(
    DEFAULT_REGION.radiusMeters,
  )
  const [selectedCategoryIds] = useState(defaultServiceCategoryIds)
  const [categoryImportance, setCategoryImportance] = useState(() =>
    buildDefaultCategoryImportance(serviceCategories),
  )
  const [priceImportance, setPriceImportance] = useState(
    defaultRankingPreferences.priceImportance,
  )
  const [preferredMonthlyRent, setPreferredMonthlyRent] = useState(() =>
    getDefaultPreferredMonthlyRent(fakeListings.features),
  )
  const [poiFeatures, setPoiFeatures] = useState([])
  const [searchError, setSearchError] = useState('')
  const [activeListingId, setActiveListingId] = useState(null)
  const [focusTarget, setFocusTarget] = useState({
    key: `region-${DEFAULT_REGION.id}`,
    center: DEFAULT_REGION.center,
    zoom: DEFAULT_REGION.zoom,
    pitch: DEFAULT_REGION.pitch,
    bearing: DEFAULT_REGION.bearing,
  })
  const latestSearchIdRef = useRef(0)
  const selectedCategoryIdsRef = useRef(selectedCategoryIds)

  useEffect(() => {
    selectedCategoryIdsRef.current = selectedCategoryIds
  }, [selectedCategoryIds])

  const selectedRegion =
    sampleRegions.find((region) => region.id === selectedRegionId) ?? DEFAULT_REGION

  const regionListings = useMemo(
    () =>
      fakeListings.features.filter(
        (listing) => listing.properties.regionId === selectedRegion.id,
      ),
    [selectedRegion.id],
  )
  const normalizedPreferences = normalizeUserPreferences({
    selectedCategoryIds,
    categoryImportance,
    priceImportance,
  })
  const rankedListings = rankListingsWithPreferences({
    listings: regionListings,
    poiFeatures,
    selectedCategoryIds,
    userPreferences: normalizedPreferences,
    preferredMonthlyRent,
    matchRadiusMeters: LISTING_MATCH_RADIUS_METERS,
    distanceMeters,
  })
  const activeListing =
    rankedListings.find((listing) => listing.properties.id === activeListingId) ?? null
  const landingSuggestions = sampleRegions.filter((region) =>
    region.name.toLowerCase().includes(landingQuery.trim().toLowerCase()),
  )

  useEffect(() => {
    setPreferredMonthlyRent(getDefaultPreferredMonthlyRent(regionListings))
  }, [regionListings])

  const performPoiSearch = useCallback(
    async ({ center, radiusMeters, categoryIds }) => {
      const searchId = latestSearchIdRef.current + 1
      latestSearchIdRef.current = searchId

      if (!categoryIds.length) {
        setPoiFeatures([])
        setSearchError('Select at least one service category before searching.')
        return
      }

      setSearchError('')

      try {
        const nextPois = await fetchPoisForArea({
          center,
          radiusMeters,
          categoryIds,
        })

        if (latestSearchIdRef.current !== searchId) {
          return
        }

        setPoiFeatures(nextPois)
      } catch (error) {
        if (latestSearchIdRef.current !== searchId) {
          return
        }

        setPoiFeatures([])
        setSearchError(
          error instanceof Error
            ? error.message
            : 'Unable to load POIs from Overpass right now.',
        )
      } finally {
        // No loading state is surfaced in the current setup/results UI.
      }
    },
    [],
  )

  useEffect(() => {
    if (!experienceStarted) {
      return
    }

    const nextCenter = selectedRegion.center
    const nextRadius = selectedRegion.radiusMeters

    setSearchCenter(nextCenter)
    setSearchRadiusMeters(nextRadius)
    setSidebarMode('setup')
    setShowPreferencesDrawer(false)
    setFocusTarget({
      key: `region-${selectedRegion.id}-${Date.now()}`,
      center: selectedRegion.center,
      zoom: selectedRegion.zoom,
      pitch: selectedRegion.pitch,
      bearing: selectedRegion.bearing,
    })

    void performPoiSearch({
      center: nextCenter,
      radiusMeters: nextRadius,
      categoryIds: selectedCategoryIdsRef.current,
    })
  }, [experienceStarted, performPoiSearch, selectedRegion])

  useEffect(() => {
    if (!rankedListings.length) {
      setActiveListingId(null)
      return
    }

    const currentListingStillVisible = rankedListings.some(
      (listing) => listing.properties.id === activeListingId,
    )

    if (currentListingStillVisible) {
      return
    }

    const topRankedListing = rankedListings[0]
    setActiveListingId(topRankedListing.properties.id)
    setFocusTarget({
      key: `listing-${topRankedListing.properties.id}-${Date.now()}`,
      center: topRankedListing.geometry.coordinates,
      zoom: 15.8,
      pitch: 60,
      bearing: -20,
    })
  }, [activeListingId, rankedListings])

  const handleSelectListing = (listingId) => {
    setActiveListingId(listingId)

    const listing = rankedListings.find(
      (candidate) => candidate.properties.id === listingId,
    )

    if (!listing) {
      return
    }

    setFocusTarget({
      key: `listing-${listing.properties.id}-${Date.now()}`,
      center: listing.geometry.coordinates,
      zoom: 15.9,
      pitch: 60,
      bearing: -20,
    })
  }

  const handleRegionChange = (regionId) => {
    setSelectedRegionId(regionId)
    setActiveListingId(null)
    setExperienceStarted(true)
    setSidebarMode('setup')
    setShowPreferencesDrawer(false)
  }

  const handleSearchSubmit = () => {
    setSidebarMode('results')
    setShowPreferencesDrawer(false)

    if (rankedListings[0]) {
      handleSelectListing(rankedListings[0].properties.id)
    }
  }

  const handleRecenterOnRegion = () => {
    setFocusTarget({
      key: `region-${selectedRegion.id}-${Date.now()}`,
      center: selectedRegion.center,
      zoom: selectedRegion.zoom,
      pitch: selectedRegion.pitch,
      bearing: selectedRegion.bearing,
    })
  }

  const handleLandingSubmit = (event) => {
    event.preventDefault()

    const trimmedQuery = landingQuery.trim().toLowerCase()
    const matchingRegion =
      sampleRegions.find((region) => region.name.toLowerCase() === trimmedQuery) ??
      sampleRegions.find((region) =>
        region.name.toLowerCase().includes(trimmedQuery),
      ) ??
      DEFAULT_REGION

    setSelectedRegionId(matchingRegion.id)
    setLandingQuery(matchingRegion.name)
    setActiveListingId(null)
    setExperienceStarted(true)
    setSidebarMode('setup')
    setShowPreferencesDrawer(false)
    setFocusTarget({
      key: `region-${matchingRegion.id}-${Date.now()}`,
      center: matchingRegion.center,
      zoom: matchingRegion.zoom,
      pitch: matchingRegion.pitch,
      bearing: matchingRegion.bearing,
    })
  }

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
    <main className={`app-shell ${experienceStarted ? 'app-shell-active' : 'app-shell-landing'}`}>
      <MapView
        token={token}
        mapStyle={mapStyle}
        timeOfDayHour={timeOfDayHour}
        experienceStarted={experienceStarted}
        searchCenter={searchCenter}
        searchRadiusMeters={searchRadiusMeters}
        poiFeatures={poiFeatures}
        listings={rankedListings}
        activeListing={activeListing}
        focusTarget={focusTarget}
        onSelectListing={handleSelectListing}
        onViewUpdate={() => {}}
        landingQuery={landingQuery}
        onLandingQueryChange={setLandingQuery}
        landingSuggestions={landingSuggestions}
        onLandingSubmit={handleLandingSubmit}
        onLandingSuggestionSelect={(region) => {
          setLandingQuery(region.name)
        }}
      />
      {experienceStarted ? (
        <Sidebar
          timeOfDayHour={timeOfDayHour}
          onTimeOfDayChange={setTimeOfDayHour}
          regions={sampleRegions}
          selectedRegionId={selectedRegionId}
          onRegionChange={handleRegionChange}
          selectedRegion={selectedRegion}
          searchRadiusMeters={searchRadiusMeters}
          onSearchRadiusChange={setSearchRadiusMeters}
          serviceCategories={serviceCategories}
          categoryImportance={categoryImportance}
          onCategoryImportanceChange={(categoryId, value) => {
            setCategoryImportance((currentImportance) => ({
              ...currentImportance,
              [categoryId]: value,
            }))
          }}
          normalizedCategoryWeights={normalizedPreferences.categoryWeights}
          priceImportance={priceImportance}
          onPriceImportanceChange={setPriceImportance}
          normalizedPriceWeight={normalizedPreferences.priceWeight}
          preferredMonthlyRent={preferredMonthlyRent}
          onPreferredMonthlyRentChange={setPreferredMonthlyRent}
          sidebarMode={sidebarMode}
          showPreferencesDrawer={showPreferencesDrawer}
          onTogglePreferencesDrawer={() =>
            setShowPreferencesDrawer((currentValue) => !currentValue)
          }
          onSubmitSearch={handleSearchSubmit}
          searchError={searchError}
          listings={rankedListings}
          activeListing={activeListing}
          onSelectListing={handleSelectListing}
          onRecenterOnRegion={handleRecenterOnRegion}
        />
      ) : null}
    </main>
  )
}

export default App
