import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

function statusInRecord(rec, statusKey) {
  // statusKey: "current" | "record" | "completed"
  const check = (val) =>
    !!val && val.toString().trim().length > 0 && val.toString().toLowerCase().includes(statusKey);
  if (check(rec[statusKey])) return true;
  if (rec.sub_files && rec.sub_files.length) {
    return rec.sub_files.some((s) => check(s[statusKey]));
  }
  return false;
}

function remarkMatches(rec, remarkFilter) {
  // remarkFilter: "all" | "has" | "none" | "cancel"
  const mainHas = !!rec.remark && rec.remark.toString().trim().length > 0;
  const subHas = rec.sub_files && rec.sub_files.some((s) => s.remark && s.remark.toString().trim().length > 0);
  const anyRemark = mainHas || subHas;

  if (remarkFilter === "all") return true;
  if (remarkFilter === "has") return anyRemark;
  if (remarkFilter === "none") return !anyRemark;
  if (remarkFilter === "cancel") {
    // consider cancelled if remark or completed contains 'cancel'
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

function App() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState({
    current: false,
    record: false,
    completed: false,
  });
  const [remarkFilter, setRemarkFilter] = useState("all"); // all | has | none | cancel
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc

  useEffect(() => {
    fetch("/cleaned_files.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load cleaned_files.json");
        return r.json();
      })
      .then((data) => {
        // ensure sub_files arrays exist
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

  // compute filtered + sorted results
  const results = useMemo(() => {
    // first filter by search query + status filters + remark filter
    const q = query.trim().toLowerCase();

    const activeStatusFilters = Object.entries(statusFilters).filter(([, v]) => v).map(([k]) => k);
    const filtered = records.filter((rec) => {
      // query match
      if (!recordMatchesQuery(rec, q)) return false;

      // statuses: if none selected => ignore. if any selected => include record if it has any of selected statuses (OR)
      if (activeStatusFilters.length > 0) {
        const anyStatusMatch = activeStatusFilters.some((sf) => statusInRecord(rec, sf));
        if (!anyStatusMatch) return false;
      }

      // remark filter
      if (!remarkMatches(rec, remarkFilter)) return false;

      return true;
    });

    // sort by file_name alphabetically
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

  return (
    <div className="app-root">
      <header className="top">
        <h1>📁 Smart File Finder</h1>
        <p className="muted">Search file names, file numbers or any sub-file names. Sub-files are shown under the parent.</p>
      </header>

      <section className="controls card">
        <div className="row">
          <input
            type="text"
            placeholder="Search by file name / file no / sub-file..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <div className="sort-block">
            <label>Sort:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>

        <div className="row filters">
          <div className="filter-group">
            <strong>Statuses</strong>
            <label><input type="checkbox" checked={statusFilters.current} onChange={() => toggleStatusFilter("current")} /> Current</label>
            <label><input type="checkbox" checked={statusFilters.record} onChange={() => toggleStatusFilter("record")} /> Record</label>
            <label><input type="checkbox" checked={statusFilters.completed} onChange={() => toggleStatusFilter("completed")} /> Completed</label>
          </div>

          <div className="filter-group">
            <strong>Remark</strong>
            <select value={remarkFilter} onChange={(e) => setRemarkFilter(e.target.value)}>
              <option value="all">All remarks</option>
              <option value="has">Has remark</option>
              <option value="none">No remark</option>
              <option value="cancel">Contains "cancel"</option>
            </select>
          </div>

          <div style={{marginLeft:"auto"}}>
            <button onClick={clearFilters} className="btn">Clear</button>
          </div>
        </div>
      </section>

      <section className="card results">
        <div className="results-header">
          <div>Showing <strong>{results.length}</strong> {results.length === 1 ? "file" : "files"}</div>
        </div>

        <table className="file-table">
          <thead>
            <tr>
              <th>File No</th>
              <th>File Name</th>
              <th>Current</th>
              <th>Record</th>
              <th>Completed</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <React.Fragment key={r.file_no + "-" + (r.file_name || Math.random())}>
                <tr className="parent-row">
                  <td className="mono">{r.file_no}</td>
                  <td className="bold">{r.file_name}</td>
                  <td className="mono small">{r.current}</td>
                  <td className="mono small">{r.record}</td>
                  <td className="mono small">{r.completed}</td>
                  <td className="small">{r.remark}</td>
                </tr>

                {r.sub_files && r.sub_files.map((s, idx) => (
                  <tr key={r.file_no + "-sub-" + idx} className="sub-row">
                    <td></td>
                    <td>↳ {s.name}</td>
                    <td className="mono small">{s.current}</td>
                    <td className="mono small">{s.record}</td>
                    <td className="mono small">{s.completed}</td>
                    <td className="small">{s.remark}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="muted footer">Tip: search "ISHKRIPA" or "TC-145" to see parent + sub-files together.</footer>
    </div>
  );
}

export default App;
