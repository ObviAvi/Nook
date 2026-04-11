function formatCurrency(value) {
  return Number(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function formatPercent(value) {
  return `${Math.round(Number(value) * 100)}%`
}

function formatDistance(value) {
  if (value == null) {
    return 'N/A'
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`
  }

  return `${Math.round(value)} m`
}

function MetricsSidebar({
  searchResult,
  listings,
  activeApartment,
  onSelectApartment,
  viewState,
  mapStyle,
  onStyleChange,
}) {
  const extractedPreferences = searchResult?.extracted_preferences
  const metadata = searchResult?.meta

  return (
    <aside className="sidebar metrics-sidebar glass-card">
      <section>
        <p className="label">Extracted Contract</p>
        <h2>Preference Schema</h2>
        <div className="schema-card">
          <strong>Constraints</strong>
          <pre>{JSON.stringify(extractedPreferences?.constraints ?? {}, null, 2)}</pre>
        </div>
        <div className="schema-card">
          <strong>Category Weights</strong>
          <pre>{JSON.stringify(extractedPreferences?.category_weights ?? {}, null, 2)}</pre>
        </div>
      </section>

      <section>
        <p className="label">Ranked Listings</p>
        <h2>GeoJSON FeatureCollection</h2>
        <ul className="listing-list">
          {listings.map((listing) => {
            const isActive = activeApartment?.id === listing.id
            const categoryBreakdown = Object.entries(
              listing.properties.category_breakdown ?? {},
            )
              .map(
                ([key, distance]) =>
                  `${key.replace('_distance_meters', '')}: ${formatDistance(distance)}`,
              )
              .join(' / ')

            return (
              <li key={listing.id}>
                <button
                  type="button"
                  className={isActive ? 'active' : ''}
                  onClick={() => onSelectApartment(listing.id)}
                >
                  <div className="listing-row">
                    <span>#{listing.properties.rank_position}</span>
                    <strong>{formatCurrency(listing.properties.monthly_price_usd)}</strong>
                  </div>
                  <small>{listing.properties.formatted_address}</small>
                  <small>
                    Match {formatPercent(listing.properties.final_normalized_score)} / Geo{' '}
                    {formatPercent(listing.properties.geo_score)} / Price{' '}
                    {formatPercent(listing.properties.price_score)}
                  </small>
                  <small>{categoryBreakdown}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {activeApartment ? (
        <section className="selected-card">
          <p className="label">Selected Apartment</p>
          <h2>{activeApartment.properties.formatted_address}</h2>
          <p>
            {activeApartment.properties.neighborhood} / {activeApartment.properties.city}
          </p>
          <p>
            {formatCurrency(activeApartment.properties.monthly_price_usd)} /{' '}
            {activeApartment.properties.bedrooms} bd / {activeApartment.properties.bathrooms} ba
          </p>
          <p>
            Ranked #{activeApartment.properties.rank_position} with{' '}
            {formatPercent(activeApartment.properties.final_normalized_score)} final score.
          </p>
        </section>
      ) : null}

      <section>
        <p className="label">Meta</p>
        <h2>Pipeline Status</h2>
        <div className="schema-card">
          <strong>Search Summary</strong>
          <pre>{JSON.stringify(metadata ?? {}, null, 2)}</pre>
        </div>
      </section>

      <section>
        <p className="label">Style</p>
        <h2>Map Basemap</h2>
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
        <p className="label">Map State</p>
        <h2>Viewport Measurements</h2>
        <div className="stat-grid">
          <article>
            <span>Longitude</span>
            <strong>{Number(viewState.lng).toFixed(4)}</strong>
          </article>
          <article>
            <span>Latitude</span>
            <strong>{Number(viewState.lat).toFixed(4)}</strong>
          </article>
          <article>
            <span>Zoom</span>
            <strong>{Number(viewState.zoom).toFixed(2)}</strong>
          </article>
          <article>
            <span>Pitch</span>
            <strong>{Number(viewState.pitch).toFixed(2)}</strong>
          </article>
          <article>
            <span>Bearing</span>
            <strong>{Number(viewState.bearing).toFixed(2)}</strong>
          </article>
        </div>
      </section>
    </aside>
  )
}

export default MetricsSidebar
