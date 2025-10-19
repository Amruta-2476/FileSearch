import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search, Mic, MicOff, Filter, X, FileText } from "lucide-react";
import "./App.css";

function statusInRecord(rec, statusKey) {
  const check = (val) =>
    !!val && val.toString().trim().length > 0 && val.toString().toLowerCase().includes(statusKey);
  if (check(rec[statusKey])) return true;
  if (rec.sub_files && rec.sub_files.length) {
    return rec.sub_files.some((s) => check(s[statusKey]));
  }
  return false;
}

function remarkMatches(rec, remarkFilter) {
  const mainHas = !!rec.remark && rec.remark.toString().trim().length > 0;
  const subHas = rec.sub_files && rec.sub_files.some((s) => s.remark && s.remark.toString().trim().length > 0);
  const anyRemark = mainHas || subHas;

  if (remarkFilter === "all") return true;
  if (remarkFilter === "has") return anyRemark;
  if (remarkFilter === "none") return !anyRemark;
  if (remarkFilter === "cancel") {
    const checkCancel = (val) =>
      !!val && val.toString().toLowerCase().includes("cancel");
    if (checkCancel(rec.remark) || checkCancel(rec.completed)) return true;
    if (rec.sub_files && rec.sub_files.some((s) => checkCancel(s.remark) || checkCancel(s.completed)))
      return true;
    return false;
  }
  return true;
}

function recordMatchesQuery(rec, q) {
  if (!q) return true;
  const qq = q.toLowerCase();
  if ((rec.file_no || "").toString().toLowerCase().includes(qq)) return true;
  if ((rec.file_name || "").toString().toLowerCase().includes(qq)) return true;
  if (rec.sub_files && rec.sub_files.some((s) => (s.name || "").toString().toLowerCase().includes(qq)))
    return true;
  return false;
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState({
    current: false,
    record: false,
    completed: false,
  });
  const [remarkFilter, setRemarkFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Voice Search States
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceError("Voice search not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setVoiceError('Microphone access denied. Please allow microphone access.');
      } else {
        setVoiceError(`Error: ${event.error}`);
      }
      
      setTimeout(() => setVoiceError(""), 3000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setVoiceError("Voice search not available");
      setTimeout(() => setVoiceError(""), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setVoiceError("");
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
        setVoiceError("Could not start voice search");
        setTimeout(() => setVoiceError(""), 3000);
      }
    }
  };

  useEffect(() => {
    fetch("/cleaned_files.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load cleaned_files.json");
        return r.json();
      })
      .then((data) => {
        const normalized = data.map((d) => ({
          file_no: d.file_no || "",
          file_name: d.file_name || "",
          current: d.current || "",
          record: d.record || "",
          completed: d.completed || "",
          remark: d.remark || "",
          sub_files: Array.isArray(d.sub_files) ? d.sub_files : [],
        }));
        setRecords(normalized);
      })
      .catch((err) => {
        console.error(err);
        setRecords([]);
      });
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeStatusFilters = Object.entries(statusFilters).filter(([, v]) => v).map(([k]) => k);
    
    const filtered = records.filter((rec) => {
      if (!recordMatchesQuery(rec, q)) return false;
      if (activeStatusFilters.length > 0) {
        const anyStatusMatch = activeStatusFilters.some((sf) => statusInRecord(rec, sf));
        if (!anyStatusMatch) return false;
      }
      if (!remarkMatches(rec, remarkFilter)) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const an = (a.file_name || "").toString().toLowerCase();
      const bn = (b.file_name || "").toString().toLowerCase();
      if (an < bn) return sortOrder === "asc" ? -1 : 1;
      if (an > bn) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [records, query, statusFilters, remarkFilter, sortOrder]);

  function toggleStatusFilter(key) {
    setStatusFilters((s) => ({ ...s, [key]: !s[key] }));
  }

  function clearFilters() {
    setStatusFilters({ current: false, record: false, completed: false });
    setRemarkFilter("all");
    setQuery("");
  }

  const activeFilterCount = Object.values(statusFilters).filter(Boolean).length + (remarkFilter !== "all" ? 1 : 0);

  return (
    <div className="app-wrapper">
      {/* Hero Section with Background */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Smart File Finder</h1>
          <p className="hero-subtitle">Intelligent file search system for architecture projects</p>
          
          {/* Search Bar */}
          <div className="hero-search-wrapper">
            <div className="hero-search-container">
              <Search className="hero-search-icon" size={20} />
              <input
                type="text"
                placeholder={isListening ? "Listening..." : "Search by file name, file number, or sub-file..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`hero-search-input ${isListening ? 'listening' : ''}`}
              />
              <button 
                onClick={toggleVoiceSearch} 
                className={`hero-mic-button ${isListening ? 'listening' : ''}`}
                title={isListening ? "Stop listening" : "Start voice search"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            
            {voiceError && (
              <div className="voice-error-inline">{voiceError}</div>
            )}
            
            {isListening && (
              <div className="voice-listening-inline">🎤 Listening... Speak now!</div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="controls-bar-content">
          <button onClick={() => setShowFilters(!showFilters)} className="controls-filter-btn">
            <Filter size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="controls-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          <div className="controls-sort">
            <span className="controls-label">Sort:</span>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="controls-sort-select">
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>

          <div className="controls-results">
            Showing <strong>{results.length}</strong> of {records.length} files
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="controls-filters-expanded">
            <div className="filter-group-inline">
              <strong>Status:</strong>
              {Object.entries({ current: 'Current', record: 'Record', completed: 'Completed' }).map(([key, label]) => (
                <label key={key} className="filter-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={statusFilters[key]}
                    onChange={() => toggleStatusFilter(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="filter-group-inline">
              <strong>Remark:</strong>
              <select value={remarkFilter} onChange={(e) => setRemarkFilter(e.target.value)} className="filter-select-inline">
                <option value="all">All</option>
                <option value="has">Has remark</option>
                <option value="none">No remark</option>
                <option value="cancel">Cancelled</option>
              </select>
            </div>

            {(activeFilterCount > 0 || query) && (
              <button onClick={clearFilters} className="controls-clear-btn">
                <X size={14} />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>FILE NO</th>
                <th>FILE NAME</th>
                <th>CURRENT</th>
                <th>RECORD</th>
                <th>COMPLETED</th>
                <th>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    <FileText size={40} />
                    <p>No files found</p>
                    <span>Try adjusting your search or filters</span>
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <React.Fragment key={r.file_no + "-" + (r.file_name || Math.random())}>
                    <tr className="table-row-parent">
                      <td className="table-cell-fileno">{r.file_no}</td>
                      <td className="table-cell-filename">{r.file_name}</td>
                      <td className="table-cell-status current">{r.current}</td>
                      <td className="table-cell-status record">{r.record}</td>
                      <td className="table-cell-status completed">{r.completed}</td>
                      <td className="table-cell-remark">{r.remark}</td>
                    </tr>

                    {r.sub_files &&
                      r.sub_files.map((s, idx) => (
                        <tr key={r.file_no + "-sub-" + idx} className="table-row-sub">
                          <td className="table-cell-fileno"></td>
                          <td className="table-cell-filename sub">
                            <span className="sub-indicator">↳</span>
                            {s.name}
                          </td>
                          <td className="table-cell-status current">{s.current}</td>
                          <td className="table-cell-status record">{s.record}</td>
                          <td className="table-cell-status completed">{s.completed}</td>
                          <td className="table-cell-remark">{s.remark}</td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}