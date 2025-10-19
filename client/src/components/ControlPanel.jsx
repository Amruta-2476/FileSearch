import React from 'react';
import { Search, Mic, ArrowUpDown, FilterX } from 'lucide-react';

const ControlPanel = ({
  query,
  setQuery,
  sortOrder,
  setSortOrder,
  statusFilters,
  toggleStatusFilter,
  remarkFilter,
  setRemarkFilter,
  clearFilters,
  resultsCount
}) => {
  return (
    <div className="controls-container">
      {/* Top row: Search and main actions */}
      <div className="controls-row">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by File Name, File No..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <Mic className="mic-icon" size={18} />
        </div>
        <div className="sort-wrapper">
          <ArrowUpDown size={16} />
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">Name (A-Z)</option>
            <option value="desc">Name (Z-A)</option>
          </select>
        </div>
        <button onClick={clearFilters} className="clear-btn">
          <FilterX size={16} />
          <span>Clear</span>
        </button>
      </div>

      {/* Bottom row: Filters */}
      <div className="controls-row filters">
        <span className="filter-label">Status:</span>
        <div className="filter-pills">
          <button
            className={`pill ${statusFilters.current ? 'active' : ''}`}
            onClick={() => toggleStatusFilter('current')}
          >
            Current
          </button>
          <button
            className={`pill ${statusFilters.record ? 'active' : ''}`}
            onClick={() => toggleStatusFilter('record')}
          >
            Record
          </button>
          <button
            className={`pill ${statusFilters.completed ? 'active' : ''}`}
            onClick={() => toggleStatusFilter('completed')}
          >
            Completed
          </button>
        </div>
        <div className="remark-filter-wrapper">
          <span className="filter-label">Remark:</span>
          <select value={remarkFilter} onChange={(e) => setRemarkFilter(e.target.value)}>
            <option value="all">All Files</option>
            <option value="has">Has Remark</option>
            <option value="none">No Remark</option>
            <option value="cancel">Contains "Cancel"</option>
          </select>
        </div>
        <div className="results-count">
          <strong>{resultsCount}</strong> {resultsCount === 1 ? 'file found' : 'files found'}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;