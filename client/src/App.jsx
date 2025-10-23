import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from 'axios';
import { Search, Mic, Filter, X, FileText, ServerCrash, CircleUserRound, LogOut, Plus, Upload, Download, Edit, Trash2 } from "lucide-react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 
import LoginModal from './components/LoginModal';
import FileEditModal from './components/FileEditModal'; 
import "./App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

function statusInRecord(rec, statusKey) {
  const check = (val) => !!val && val.toString().trim().length > 0; 
  if (check(rec[statusKey])) return true;
  if (rec.sub_files && rec.sub_files.length) {
    return rec.sub_files.some((s) => check(s[statusKey])); 
  }
  return false;
}

// Check if a record matches the remark ('all', 'has', 'none', 'cancel')
function remarkMatches(rec, remarkFilter) {
  const mainHas = !!rec.remark && rec.remark.toString().trim().length > 0;
  const subHas = rec.sub_files && rec.sub_files.some((s) => s.remark && s.remark.toString().trim().length > 0);
  const anyRemark = mainHas || subHas;

  if (remarkFilter === "all") return true;
  if (remarkFilter === "has") return anyRemark;
  if (remarkFilter === "none") return !anyRemark;
  if (remarkFilter === "cancel") {
    const checkCancel = (val) => !!val && val.toString().toLowerCase().includes("cancel");
    if (checkCancel(rec.remark) || checkCancel(rec.completed)) return true;
    if (rec.sub_files && rec.sub_files.some((s) => checkCancel(s.remark) || checkCancel(s.completed))) return true; 
    return false;
  }
  return true;
}

function recordMatchesQuery(rec, q) {
  if (!q) return true;
  const qq = q.toLowerCase();
  if ((rec.file_no || "").toString().toLowerCase().includes(qq)) return true;
  if ((rec.file_name || "").toString().toLowerCase().includes(qq)) return true;
  if (rec.sub_files && rec.sub_files.some((s) => (s.name || "").toString().toLowerCase().includes(qq))) return true;
  return false;
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  const [statusFilters, setStatusFilters] = useState({ current: false, record: false, completed: false });
  const [remarkFilter, setRemarkFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Admin and Modal States
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFileEditModal, setShowFileEditModal] = useState(false); 
  const [editingFile, setEditingFile] = useState(null);
  const fileInputRef = useRef(null); 

  // Voice Search States
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice search not supported");
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
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') setVoiceError('No speech detected.');
      else if (event.error === 'not-allowed') setVoiceError('Mic access denied.');
      else setVoiceError(`Error: ${event.error}`);
      setTimeout(() => setVoiceError(""), 3000); 
    };
    recognitionRef.current = recognition;
    return () => recognitionRef.current?.abort(); 
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAdmin(true);
    fetchFiles();
  }, []);
  
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/files');
      const normalized = response.data.map(d => ({...d, sub_files: d.sub_files || [] }));
      setRecords(normalized);
      setFetchError(null);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeStatusFilters = Object.entries(statusFilters).filter(([, v]) => v).map(([k]) => k);
    
    // Apply filters first
    const filtered = records.filter((rec) => {
      if (!recordMatchesQuery(rec, q)) return false; 
      if (activeStatusFilters.length > 0 && !activeStatusFilters.every(sfKey => statusInRecord(rec, sfKey))) { 
          return false;
      }
      if (!remarkMatches(rec, remarkFilter)) return false; 
      return true;
    });

    return [...filtered].sort((a, b) => {
      const an = (a.file_name || "").toString().toLowerCase();
      const bn = (b.file_name || "").toString().toLowerCase();
      
      if (!an && bn) return sortOrder === "asc" ? 1 : -1; // Empty names go last in asc, first in desc
      if (an && !bn) return sortOrder === "asc" ? -1 : 1; // Empty names go last in asc, first in desc
      if (!an && !bn) return 0; // Both empty, keep original relative order

      // Normal string comparison
      if (an < bn) return sortOrder === "asc" ? -1 : 1;
      if (an > bn) return sortOrder === "asc" ? 1 : -1;
      
      const aNo = (a.file_no || "").toString().toLowerCase();
      const bNo = (b.file_no || "").toString().toLowerCase();
      if (aNo < bNo) return -1; 
      if (aNo > bNo) return 1;

      return 0;
    });
  }, [records, query, statusFilters, remarkFilter, sortOrder]);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
        setVoiceError("Voice search not available");
        setTimeout(() => setVoiceError(""), 3000);
        return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setVoiceError("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        setVoiceError("Could not start voice search");
        setTimeout(() => setVoiceError(""), 3000);
      }
    }
  };

  function toggleStatusFilter(key) {
    setStatusFilters((s) => ({ ...s, [key]: !s[key] }));
  }

  function clearFilters() {
    setStatusFilters({ current: false, record: false, completed: false });
    setRemarkFilter("all");
  }

  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    setIsAdmin(true);
    setShowLoginModal(false);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAdmin(false);
  };

  const handleSaveFile = async (fileData) => {
  try {
    let response;
    if (editingFile) {
      response = await api.put(`/files/${editingFile.id}`, fileData);
      toast.success(`File "${response.data.file_no}" updated successfully!`);
    } else {
      response = await api.post('/files', fileData);
      toast.success(`File "${response.data.file_no}" created successfully!`);
    }
    setShowFileEditModal(false); setEditingFile(null); fetchFiles();
  } catch (error) {
    console.error('Failed to save file:', error);
    toast.error('Error: Could not save file.'); 
  }
};

  const handleDeleteFile = async (fileId) => {
  // Keep window.confirm for safety
  if (window.confirm('Delete this record permanently?')) {
    try {
      await api.delete(`/files/${fileId}`);
      toast.success('File deleted successfully!'); 
      fetchFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Error: Could not delete file.'); 
    }
  }
};

  const handleOpenEditModal = (file = null) => {
    setEditingFile(file); setShowFileEditModal(true);
  };
  
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/files/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `file_export_${Date.now()}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('CSV export started successfully!'); 
    } catch (error) { console.error('Failed to export CSV:', error); toast.error('Error: Could not export data.'); }
  };
  

  const handleImportCSV = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('csvfile', file);
    try {
      const response = await api.post('/files/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.status === 201 || response.status === 207) {
        toast.success(response.data.message);
    } else {
        toast.warn(response.data.message || 'CSV import finished with warnings.');
    }
    fetchFiles();
    } catch (error) {
      console.error('Failed to import CSV:', error);
      const errorMsg = error.response?.data?.message || 'Error: Could not import CSV.';
    toast.error(errorMsg); // Use toast.error
  }
  event.target.value = null;
};

  const activeFilterCount = Object.values(statusFilters).filter(Boolean).length + (remarkFilter !== "all" ? 1 : 0);
  
  const renderTableContent = () => {
    const colSpan = isAdmin ? 7 : 6;
    if (isLoading) return <tr><td colSpan={colSpan} className="table-empty"><div className="spinner"></div><p>Loading files...</p></td></tr>;
    if (fetchError) return <tr><td colSpan={colSpan} className="table-empty error"><ServerCrash size={40} /><p>Failed to load data</p><span>Could not connect.</span></td></tr>;
    if (results.length === 0) return <tr><td colSpan={colSpan} className="table-empty"><FileText size={40} /><p>No files found</p><span>Adjust search or filters.</span></td></tr>;

    const renderStatusBadge = (value, statusType) => {
        if (value && value.trim() !== '') {
            return <span className={`status-badge ${statusType}`}>{value}</span>;
        }
        return <span className="status-badge empty">-</span>; // Style for empty cells
    };

    return results.map((r) => (
        <React.Fragment key={r.id}>
            <tr className="table-row-parent">
                <td className="table-cell-fileno">{r.file_no}</td>
                <td className="table-cell-filename">{r.file_name}</td>
                <td className="table-cell-status">{renderStatusBadge(r.current, 'current')}</td>
                <td className="table-cell-status">{renderStatusBadge(r.record, 'record')}</td>
                <td className="table-cell-status">{renderStatusBadge(r.completed, 'completed')}</td>
                <td className="table-cell-remark">{r.remark || '-'}</td>
                {isAdmin && (
                  <td className="table-cell-actions">
                    <button onClick={() => handleOpenEditModal(r)} className="action-btn edit-btn" title="Edit"><Edit size={16}/></button>
                    <button onClick={() => handleDeleteFile(r.id)} className="action-btn delete-btn" title="Delete"><Trash2 size={16}/></button>
                  </td>
                )}
            </tr>
            {r.sub_files && r.sub_files.map((s, idx) => (
                <tr key={`${r.id}-sub-${idx}`} className="table-row-sub">
                    <td></td>
                    <td className="table-cell-filename sub"><span className="sub-indicator">↳</span>{s.name}</td>
                    <td className="table-cell-status">{renderStatusBadge(s.current, 'current')}</td>
                    <td className="table-cell-status">{renderStatusBadge(s.record, 'record')}</td>
                    <td className="table-cell-status">{renderStatusBadge(s.completed, 'completed')}</td>
                    <td className="table-cell-remark">{s.remark || '-'}</td>
                    {isAdmin && <td></td>}
                </tr>
            ))}
        </React.Fragment>
    ));
  };

  return (
    <div className="app-wrapper">
      {/* Modals */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={handleLoginSuccess} />}
      {showFileEditModal && <FileEditModal file={editingFile} onClose={() => setShowFileEditModal(false)} onSave={handleSaveFile} />}

      {/* Header with Login/Logout */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="header-title">Smart File Finder</h1>
          <div className="header-actions">
            {isAdmin ? (
              <button onClick={handleLogout} className="header-btn"><LogOut size={16} /> Logout</button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="header-btn"><CircleUserRound size={18} /> Admin Login</button>
            )}
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <p className="hero-subtitle">
            Instantly Locate Any Project File. Search Smarter, Build Faster.
          </p>
          <div className="hero-search-wrapper">
            <div className="hero-search-container">
              <Search className="hero-search-icon" size={20} />
              <input type="text" placeholder={isListening ? "Listening..." : "Search by file name, file number, or sub-file..."} value={query} onChange={(e) => setQuery(e.target.value)} className={`hero-search-input ${isListening ? 'listening' : ''}`} />
              <button onClick={toggleVoiceSearch} className={`hero-mic-button ${isListening ? 'listening' : ''}`} title={isListening ? "Stop listening" : "Start voice search"}>
                {isListening ? <Mic size={20} /> : <Mic size={20} />}
              </button>
            </div>
            {voiceError && <div className="voice-error-inline">{voiceError}</div>}
            {isListening && <div className="voice-listening-inline">🎤 Listening... Speak now!</div>}
          </div>
        </div>
      </div>
      
      {/* Controls Bar (Filters & Sort) */}
      <div className="controls-bar">
        <div className="controls-bar-content">
          <button onClick={() => setShowFilters(!showFilters)} className="controls-filter-btn">
            <Filter size={16} /><span>Filters</span>
            {activeFilterCount > 0 && <span className="controls-filter-badge">{activeFilterCount}</span>}
          </button>
          <div className="controls-sort">
            <span className="controls-label">Sort By Name:</span>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="controls-sort-select">
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
          <div className="controls-results">Showing <strong>{results.length}</strong> {results.length === 1 ? 'file' : 'files'}</div>
        </div>
        {/* Expanded Filter Section */}
        {showFilters && (
          <div className="controls-filters-expanded">
            <div className="filter-group-inline">
              <strong>Status:</strong>
              {Object.entries({ current: 'Current', record: 'Record', completed: 'Completed' }).map(([key, label]) => (
                <label key={key} className="filter-checkbox-inline">
                  <input type="checkbox" checked={statusFilters[key]} onChange={() => toggleStatusFilter(key)} />
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
            {(activeFilterCount > 0) && (
              <button onClick={clearFilters} className="controls-clear-btn"><X size={14} /> Clear Filters</button>
            )}
          </div>
        )}
      </div>

      {/* Main Table Section */}
      <main className="app-main table-section">
        {/* Admin Controls (Add, Import, Export)*/}
        {isAdmin && (
          <div className="admin-controls">
              <button className="admin-btn" onClick={() => handleOpenEditModal()}>
                  <Plus size={16} /> Add New File
              </button>
              <button className="admin-btn" onClick={() => fileInputRef.current.click()}>
                  <Upload size={16} /> Import CSV
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} accept=".csv" />
              <button className="admin-btn" onClick={handleExportCSV}>
                  <Download size={16} /> Export CSV
              </button>
          </div>
        )}
        
        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="table-header-fileno">File No</th>
                <th className="table-header-filename">File Name</th>
                <th className="table-header-status">Current</th>
                <th className="table-header-status">Record</th>
                <th className="table-header-status">Completed</th>
                <th className="table-header-remark">Remark</th>
                {isAdmin && <th className="table-header-actions">Actions</th>}
              </tr>
            </thead>
            <tbody>{renderTableContent()}</tbody>
          </table>
        </div>
      </main>

      <footer className="app-footer">
        
      </footer>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}