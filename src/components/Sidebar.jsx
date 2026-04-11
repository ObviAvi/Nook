function Sidebar({
  viewState,
  mapStyle,
  onStyleChange,
  timeOfDayHour,
  onTimeOfDayChange,
  regions,
  selectedRegionId,
  onRegionChange,
  selectedRegion,
  searchRadiusMeters,
  onSearchRadiusChange,
  serviceCategories,
  selectedCategoryIds,
  onToggleCategory,
  categoryImportance,
  onCategoryImportanceChange,
  normalizedCategoryWeights,
  priceImportance,
  onPriceImportanceChange,
  normalizedPriceWeight,
  preferredMonthlyRent,
  onPreferredMonthlyRentChange,
  onSubmitSearch,
  isLoadingPois,
  searchError,
  lastSearchSummary,
  poiCountsByCategory,
  listings,
  rankedApartmentMap,
  activeListing,
  onSelectListing,
  onRecenterOnRegion,
}) {
  const formatValue = (value) => value.toFixed(4)
  const formatPercent = (value) => `${Math.round(value * 100)}%`
  const formatCurrency = (amount) =>
    amount.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
  const formatDistance = (distanceMeters) =>
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(distanceMeters)} m`
  const formatTime = (hourValue) => {
    const totalMinutes = Math.round(hourValue * 60)
    const normalized = ((totalMinutes % 1440) + 1440) % 1440
    const hour = Math.floor(normalized / 60)
    const minutes = normalized % 60

    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  const listingRents = listings.map((listing) => listing.properties.monthlyRent)
  const minimumRent = listingRents.length ? Math.min(...listingRents) : 500
  const maximumRent = listingRents.length ? Math.max(...listingRents) : 3000

  const getPhaseLabel = (hourValue) => {
    if (hourValue < 5 || hourValue >= 20) {
      return 'Night'
    }

    if (hourValue < 8) {
      return 'Dawn'
    }

    if (hourValue < 17) {
      return 'Day'
    }

    return 'Dusk'
  }

  return (
    <aside className="sidebar glass-card">
      <section>
        <p className="label">Area Setup</p>
        <h2>Search Region</h2>
        <label className="field-stack">
          <span>Sample area</span>
          <select
            className="sidebar-select"
            value={selectedRegionId}
            onChange={(event) => onRegionChange(event.target.value)}
          >
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <p className="section-copy">{selectedRegion.description}</p>

        <div className="radius-card">
          <div className="time-slider-head">
            <strong>{formatDistance(searchRadiusMeters)}</strong>
            <span>Overpass Radius</span>
          </div>
          <input
            className="time-slider"
            type="range"
            min="500"
            max="3000"
            step="100"
            value={searchRadiusMeters}
            onChange={(event) => onSearchRadiusChange(Number(event.target.value))}
            aria-label="Search radius"
          />
          <div className="time-slider-scale">
            <span>0.5 km</span>
            <span>1.5 km</span>
            <span>3.0 km</span>
          </div>
        </div>

        <div className="stacked-actions">
          <button type="button" className="launch-button" onClick={onSubmitSearch}>
            {isLoadingPois ? 'Loading OSM data...' : 'Search Selected Services'}
          </button>
          <button type="button" className="secondary-button" onClick={onRecenterOnRegion}>
            Recenter Map
          </button>
        </div>

        {lastSearchSummary ? <p className="status-copy">{lastSearchSummary}</p> : null}
        {searchError ? <p className="inline-error">{searchError}</p> : null}
      </section>

      <section>
        <p className="label">Filters</p>
        <h2>Service Categories</h2>
        <div className="service-grid">
          {serviceCategories.map((category) => {
            const isActive = selectedCategoryIds.includes(category.id)
            const count = poiCountsByCategory[category.id] ?? 0

            return (
              <label
                key={category.id}
                className={`service-card ${isActive ? 'active' : ''}`}
                style={{ '--service-color': category.color }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggleCategory(category.id)}
                />
                <div>
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                  <small>{count} loaded from OSM</small>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      <section>
        <p className="label">Ranking Inputs</p>
        <h2>Weighted Preferences</h2>
        <div className="preference-stack">
          {serviceCategories.map((category) => {
            const isActive = selectedCategoryIds.includes(category.id)
            const rawImportance = categoryImportance[category.id] ?? 0
            const normalizedWeight = normalizedCategoryWeights[category.id] ?? 0

            return (
              <div key={category.id} className={`preference-card ${isActive ? 'active' : ''}`}>
                <div className="preference-head">
                  <strong>{category.label}</strong>
                  <span>
                    Raw {formatPercent(rawImportance)} / Normalized {formatPercent(normalizedWeight)}
                  </span>
                </div>
                <input
                  className="time-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={rawImportance}
                  disabled={!isActive}
                  onChange={(event) =>
                    onCategoryImportanceChange(category.id, Number(event.target.value))
                  }
                  aria-label={`${category.label} importance`}
                />
              </div>
            )
          })}

          <div className="preference-card active">
            <div className="preference-head">
              <strong>Price Importance</strong>
              <span>
                Raw {formatPercent(priceImportance)} / Normalized {formatPercent(normalizedPriceWeight)}
              </span>
            </div>
            <input
              className="time-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priceImportance}
              onChange={(event) => onPriceImportanceChange(Number(event.target.value))}
              aria-label="Price importance"
            />
          </div>

          <div className="preference-card active">
            <div className="preference-head">
              <strong>Preferred Monthly Rent</strong>
              <span>{formatCurrency(preferredMonthlyRent)}</span>
            </div>
            <input
              className="time-slider"
              type="range"
              min={minimumRent}
              max={maximumRent}
              step="25"
              value={preferredMonthlyRent}
              onChange={(event) =>
                onPreferredMonthlyRentChange(Number(event.target.value))
              }
              aria-label="Preferred monthly rent"
            />
            <div className="time-slider-scale">
              <span>{formatCurrency(minimumRent)}</span>
              <span>{formatCurrency(maximumRent)}</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="label">Ranked Listings</p>
        <h2>Best Matches Right Now</h2>
        <ul className="listing-list">
          {listings.map((listing) => {
            const isActive = activeListing?.properties.id === listing.properties.id
            const breakdownText = selectedCategoryIds
              .map((categoryId) => {
                const category = serviceCategories.find(
                  (candidate) => candidate.id === categoryId,
                )
                const count = listing.properties.serviceBreakdown[categoryId] ?? 0
                return `${count} ${category?.shortLabel ?? categoryId}`
              })
              .join(' / ')

            return (
              <li key={listing.properties.id}>
                <button
                  type="button"
                  className={isActive ? 'active' : ''}
                  onClick={() => onSelectListing(listing.properties.id)}
                >
                  <div className="listing-row">
                    <span>
                      #{listing.properties.rank} {listing.properties.title}
                    </span>
                    <strong>{formatCurrency(listing.properties.monthlyRent)}</strong>
                  </div>
                  <small>
                    {listing.properties.neighborhood} / {listing.properties.beds} bd /{' '}
                    {listing.properties.baths} ba
                  </small>
                  <small>{listing.properties.rankLabel}</small>
                  <small>
                    Price {formatPercent(listing.properties.priceScore)} / Weighted{' '}
                    {formatPercent(listing.properties.priceContribution)}
                  </small>
                  <small>{breakdownText}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {activeListing ? (
        <section className="selected-card">
          <p className="label">Selected Listing</p>
          <h2>{activeListing.properties.title}</h2>
          <p>
            {activeListing.properties.neighborhood} /{' '}
            {formatCurrency(activeListing.properties.monthlyRent)} /{' '}
            {activeListing.properties.sqft} sq ft
          </p>
          <p>
            Nearby selected services: {activeListing.properties.rankLabel}
            {activeListing.properties.closestPoiDistance !== null
              ? ` / closest match ${formatDistance(activeListing.properties.closestPoiDistance)} away`
              : ''}
          </p>
          <p>
            Price score {formatPercent(activeListing.properties.priceScore)} / weighted price contribution{' '}
            {formatPercent(activeListing.properties.priceContribution)}
          </p>
        </section>
      ) : null}

      <section>
        <p className="label">Schemas</p>
        <h2>Communication Shapes</h2>
        <div className="schema-card">
          <strong>Category Weights</strong>
          <pre>{JSON.stringify(normalizedCategoryWeights, null, 2)}</pre>
        </div>
        <div className="schema-card">
          <strong>Ranked Apartments</strong>
          <pre>{JSON.stringify(rankedApartmentMap, null, 2)}</pre>
        </div>
      </section>

      <section>
        <p className="label">Style</p>
        <h2>Visual Mode</h2>
        <div className="segmented-control" role="radiogroup" aria-label="Map Style">
          <button
            type="button"
            role="radio"
            aria-checked={mapStyle === 'mapbox://styles/mapbox/standard'}
            className={mapStyle === 'mapbox://styles/mapbox/standard' ? 'active' : ''}
            onClick={() => onStyleChange('mapbox://styles/mapbox/standard')}
          >
            Standard
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12'}
            className={
              mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' ? 'active' : ''
            }
            onClick={() => onStyleChange('mapbox://styles/mapbox/satellite-streets-v12')}
          >
            Satellite
          </button>
        </div>
      </section>

      <section>
        <p className="label">Lighting</p>
        <h2>Time of Day</h2>
        <div className="time-slider-wrap">
          <div className="time-slider-head">
            <strong>{formatTime(timeOfDayHour)}</strong>
            <span>{getPhaseLabel(timeOfDayHour)}</span>
          </div>
          <input
            className="time-slider"
            type="range"
            min="0"
            max="24"
            step="0.25"
            value={timeOfDayHour}
            onChange={(event) => onTimeOfDayChange(Number(event.target.value))}
            aria-label="Time of day"
          />
          <div className="time-slider-scale">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </section>

      <section>
        <p className="label">Map State</p>
        <h2>Live Coordinates</h2>
        <div className="stat-grid">
          <article>
            <span>Longitude</span>
            <strong>{formatValue(viewState.lng)}</strong>
          </article>
          <article>
            <span>Latitude</span>
            <strong>{formatValue(viewState.lat)}</strong>
          </article>
          <article>
            <span>Zoom</span>
            <strong>{formatValue(viewState.zoom)}</strong>
          </article>
          <article>
            <span>Pitch</span>
            <strong>{formatValue(viewState.pitch)}</strong>
          </article>
          <article>
            <span>Bearing</span>
            <strong>{formatValue(viewState.bearing)}</strong>
          </article>
        </div>
      </section>
    </aside>
  )
}

export default Sidebar
