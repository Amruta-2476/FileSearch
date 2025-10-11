import React from 'react';
import { FileWarning, LoaderCircle, Inbox } from 'lucide-react';

const StatusCell = ({ value, type }) => {
  if (!value) return <span className="cell-muted">-</span>;
  return <span className={`status-badge ${type}`}>{value}</span>;
};

const FileRow = ({ record }) => (
  <>
    <tr className="parent-row">
      <td className="cell-file-no">{record.file_no}</td>
      <td className="cell-file-name">{record.file_name}</td>
      <td><StatusCell value={record.current} type="current" /></td>
      <td><StatusCell value={record.record} type="record" /></td>
      <td><StatusCell value={record.completed} type="completed" /></td>
      <td className="cell-remark">{record.remark || <span className="cell-muted">-</span>}</td>
    </tr>
    {record.sub_files && record.sub_files.map((sub, idx) => (
      <tr key={`${record.file_no}-sub-${idx}`} className="sub-row">
        <td></td>
        <td className="cell-file-name">
          <span className="sub-row-indicator">↳</span>
          {sub.name}
        </td>
        <td><StatusCell value={sub.current} type="current" /></td>
        <td><StatusCell value={sub.record} type="record" /></td>
        <td><StatusCell value={sub.completed} type="completed" /></td>
        <td className="cell-remark">{sub.remark || <span className="cell-muted">-</span>}</td>
      </tr>
    ))}
  </>
);

const FileTable = ({ results, loading, error }) => {
  if (loading) {
    return (
      <div className="feedback-state">
        <LoaderCircle className="spinner" size={48} />
        <p>Loading Files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-state error">
        <FileWarning size={48} />
        <p>Failed to load file data. Please check the console or try again later.</p>
        <pre>{error}</pre>
      </div>
    );
  }
  
  if (results.length === 0) {
    return (
      <div className="feedback-state">
        <Inbox size={48} />
        <p>No files match your search criteria.</p>
        <span>Try adjusting your filters or search query.</span>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="file-table">
              <thead>
                <tr>
                    <th style={{ width: '10%' }}>File No.</th>
                    <th style={{ width: '50%' }}>File / Project Name</th>
                    <th style={{ width: '10%' }}>Current</th>
                    <th style={{ width: '10%' }}>Record</th>
                    <th style={{ width: '10%' }}>Completed</th>
                    <th style={{ width: '10%' }}>Remark</th>
                </tr>
              </thead>
        <tbody>
          {results.map((r, index) => (
            <FileRow key={`${r.file_no}-${index}`} record={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileTable;