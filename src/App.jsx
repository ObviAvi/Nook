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
  createRankedApartmentMap,
  defaultRankingPreferences,
  normalizeUserPreferences,
  rankListingsWithPreferences,
} from './lib/ranking'
import './App.css'

const LISTING_MATCH_RADIUS_METERS = 1200
const DEFAULT_REGION = sampleRegions[0]

function buildPoiCountsByCategory(poiFeatures) {
  return poiFeatures.reduce((counts, feature) => {
    const categoryId = feature.properties.categoryId
    counts[categoryId] = (counts[categoryId] ?? 0) + 1
    return counts
  }, {})
}

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
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/standard')
  const [timeOfDayHour, setTimeOfDayHour] = useState(15.25)
  const [selectedRegionId, setSelectedRegionId] = useState(DEFAULT_REGION.id)
  const [searchCenter, setSearchCenter] = useState(DEFAULT_REGION.center)
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(
    DEFAULT_REGION.radiusMeters,
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    defaultServiceCategoryIds,
  )
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
  const [isLoadingPois, setIsLoadingPois] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [lastSearchSummary, setLastSearchSummary] = useState('')
  const [activeListingId, setActiveListingId] = useState(null)
  const [focusTarget, setFocusTarget] = useState({
    key: `region-${DEFAULT_REGION.id}`,
    center: DEFAULT_REGION.center,
    zoom: DEFAULT_REGION.zoom,
    pitch: DEFAULT_REGION.pitch,
    bearing: DEFAULT_REGION.bearing,
  })
  const [viewState, setViewState] = useState({
    lng: DEFAULT_REGION.center[0],
    lat: DEFAULT_REGION.center[1],
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
  const rankedApartmentMap = createRankedApartmentMap(rankedListings)
  const activeListing =
    rankedListings.find((listing) => listing.properties.id === activeListingId) ?? null
  const poiCountsByCategory = buildPoiCountsByCategory(poiFeatures)
  const landingSuggestions = sampleRegions.filter((region) =>
    region.name.toLowerCase().includes(landingQuery.trim().toLowerCase()),
  )

  useEffect(() => {
    setPreferredMonthlyRent(getDefaultPreferredMonthlyRent(regionListings))
  }, [regionListings])

  const performPoiSearch = useCallback(
    async ({ center, radiusMeters, categoryIds, regionName }) => {
      const searchId = latestSearchIdRef.current + 1
      latestSearchIdRef.current = searchId

      if (!categoryIds.length) {
        setPoiFeatures([])
        setIsLoadingPois(false)
        setSearchError('Select at least one service category before searching.')
        setLastSearchSummary('')
        return
      }

      setIsLoadingPois(true)
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
        setLastSearchSummary(
          `${nextPois.length} live OSM matches loaded for ${regionName}.`,
        )
      } catch (error) {
        if (latestSearchIdRef.current !== searchId) {
          return
        }

        setPoiFeatures([])
        setLastSearchSummary('')
        setSearchError(
          error instanceof Error
            ? error.message
            : 'Unable to load POIs from Overpass right now.',
        )
      } finally {
        if (latestSearchIdRef.current === searchId) {
          setIsLoadingPois(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const nextCenter = selectedRegion.center
    const nextRadius = selectedRegion.radiusMeters

    setSearchCenter(nextCenter)
    setSearchRadiusMeters(nextRadius)
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
      regionName: selectedRegion.name,
    })
  }, [performPoiSearch, selectedRegion])

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
  }

  const handleSearchSubmit = () => {
    void performPoiSearch({
      center: searchCenter,
      radiusMeters: searchRadiusMeters,
      categoryIds: selectedCategoryIds,
      regionName: selectedRegion.name,
    })
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
        onViewUpdate={setViewState}
        landingQuery={landingQuery}
        onLandingQueryChange={setLandingQuery}
        landingSuggestions={landingSuggestions}
        onLandingSubmit={handleLandingSubmit}
        onLandingSuggestionSelect={(region) => {
          setLandingQuery(region.name)
          setSelectedRegionId(region.id)
          setActiveListingId(null)
          setExperienceStarted(true)
          setFocusTarget({
            key: `region-${region.id}-${Date.now()}`,
            center: region.center,
            zoom: region.zoom,
            pitch: region.pitch,
            bearing: region.bearing,
          })
        }}
      />
      {experienceStarted ? (
        <Sidebar
          viewState={viewState}
          mapStyle={mapStyle}
          onStyleChange={setMapStyle}
          timeOfDayHour={timeOfDayHour}
          onTimeOfDayChange={setTimeOfDayHour}
          regions={sampleRegions}
          selectedRegionId={selectedRegionId}
          onRegionChange={handleRegionChange}
          selectedRegion={selectedRegion}
          searchRadiusMeters={searchRadiusMeters}
          onSearchRadiusChange={setSearchRadiusMeters}
          serviceCategories={serviceCategories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={(categoryId) => {
            setSelectedCategoryIds((currentCategories) =>
              currentCategories.includes(categoryId)
                ? currentCategories.filter((currentCategoryId) => currentCategoryId !== categoryId)
                : [...currentCategories, categoryId],
            )
          }}
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
          onSubmitSearch={handleSearchSubmit}
          isLoadingPois={isLoadingPois}
          searchError={searchError}
          lastSearchSummary={lastSearchSummary}
          poiCountsByCategory={poiCountsByCategory}
          listings={rankedListings}
          rankedApartmentMap={rankedApartmentMap}
          activeListing={activeListing}
          onSelectListing={handleSelectListing}
          onRecenterOnRegion={handleRecenterOnRegion}
        />
      ) : null}
    </main>
  )
}

export default App
