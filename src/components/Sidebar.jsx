function Sidebar({
  timeOfDayHour,
  onTimeOfDayChange,
  regions,
  selectedRegionId,
  onRegionChange,
  selectedRegion,
  searchRadiusMeters,
  onSearchRadiusChange,
  serviceCategories,
  categoryImportance,
  onCategoryImportanceChange,
  normalizedCategoryWeights,
  priceImportance,
  onPriceImportanceChange,
  normalizedPriceWeight,
  preferredMonthlyRent,
  onPreferredMonthlyRentChange,
  sidebarMode,
  showPreferencesDrawer,
  onTogglePreferencesDrawer,
  onSubmitSearch,
  isAmenityLoading,
  searchError,
  listings,
  activeListing,
  onSelectListing,
  onRecenterOnRegion,
}) {
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

  const renderPreferenceControls = () => (
    <>
      <section>
        <h2>Set Your Priorities</h2>
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
        <p
          className={`label amenity-status ${isAmenityLoading ? 'amenity-loading' : ''}`}
          role="status"
          aria-live="polite"
        >
          {isAmenityLoading ? (
            <>
              Loading Amenities
              <span className="loading-dots" aria-hidden="true">
                ...
              </span>
            </>
          ) : (
            'Amenities Synced For This Area'
          )}
        </p>

        <div className="radius-card">
          <div className="time-slider-head">
            <strong>{formatDistance(searchRadiusMeters)}</strong>
            <span>Search Radius</span>
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
          {sidebarMode === 'setup' ? (
            <button type="button" className="launch-button" onClick={onSubmitSearch}>
              Show Listings
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={onRecenterOnRegion}>
            Recenter Map
          </button>
        </div>

        {searchError ? <p className="inline-error">{searchError}</p> : null}
      </section>

      <section>
        <p className="label">Weighted Preferences</p>
        <h2>Your Priorities</h2>
        <div className="preference-stack">
          {serviceCategories.map((category) => {
            const rawImportance = categoryImportance[category.id] ?? 0
            const normalizedWeight = normalizedCategoryWeights[category.id] ?? 0

            return (
              <div key={category.id} className="preference-card active">
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
    </>
  )

  const renderResults = () => (
    <>
      <section>
        <div className="results-head">
          <div>
            <p className="label">Ranked Apartments</p>
            <h2>Best Fits In {selectedRegion.name}</h2>
          </div>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={onTogglePreferencesDrawer}
          >
            {showPreferencesDrawer ? 'Hide Preferences' : 'Adjust Preferences'}
          </button>
        </div>
        <p className="section-copy">
          Rankings update instantly from your weighted preferences using the
          neighborhood services that were already loaded.
        </p>
      </section>

      {showPreferencesDrawer ? (
        <div className="preferences-drawer">
          {renderPreferenceControls()}
        </div>
      ) : null}

      <section>
        <ul className="listing-list">
          {listings.map((listing) => {
            const isActive = activeListing?.properties.id === listing.properties.id
            const breakdownText = serviceCategories
              .map((categoryId) => {
                const count = listing.properties.serviceBreakdown[categoryId.id] ?? 0
                return `${count} ${categoryId.shortLabel ?? categoryId.id}`
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
    </>
  )

  return (
    <aside className="sidebar glass-card">
      {sidebarMode === 'setup' ? renderPreferenceControls() : renderResults()}

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
    </aside>
  )
}

export default Sidebar
