function formatMessageTime(isoString) {
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function LlmSidebar({
  userPrompt,
  onPromptChange,
  listingSource,
  onListingSourceChange,
  onSubmitSearch,
  onResetChat,
  isLoading,
  searchError,
  chatHistory,
}) {
  return (
    <aside className="sidebar llm-sidebar glass-card">
      <section>
        <p className="label">LLM Service</p>
        <h2>Prompt Workspace</h2>
        <div className="segmented-control" role="radiogroup" aria-label="Listing Source">
          <button
            type="button"
            role="radio"
            aria-checked={listingSource === 'mock'}
            className={listingSource === 'mock' ? 'active' : ''}
            onClick={() => onListingSourceChange('mock')}
          >
            Mock Data
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={listingSource === 'rentcast'}
            className={listingSource === 'rentcast' ? 'active' : ''}
            onClick={() => onListingSourceChange('rentcast')}
          >
            RentCast
          </button>
        </div>
        <p className="status-copy">
          Mock-first mode is active for hackathon reliability. RentCast is optional and auto-falls back.
        </p>
        <textarea
          className="prompt-input"
          value={userPrompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={7}
          placeholder="Describe apartment constraints and lifestyle priorities."
        />
        <div className="chat-actions">
          <button type="button" className="launch-button" onClick={onSubmitSearch}>
            {isLoading ? 'Running Agentic Ranking...' : 'Run LLM + Ranking Pipeline'}
          </button>
          <button type="button" className="ghost-button" onClick={onResetChat}>
            Chat Reset
          </button>
        </div>
        {searchError ? <p className="inline-error">{searchError}</p> : null}
      </section>

      <section>
        <p className="label">Chat History</p>
        <h2>Conversation Trace</h2>
        <div className="chat-history">
          {chatHistory.length ? (
            chatHistory.map((entry) => (
              <article key={entry.id} className={`chat-message chat-message-${entry.role}`}>
                <div className="chat-message-head">
                  <strong>{entry.role === 'assistant' ? 'Assistant' : 'You'}</strong>
                  <span>{formatMessageTime(entry.timestamp)}</span>
                </div>
                <p>{entry.text}</p>
              </article>
            ))
          ) : (
            <p className="section-copy">No history yet. Submit a prompt to start the chat trace.</p>
          )}
        </div>
      </section>
    </aside>
  )
}

export default LlmSidebar
