import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2 } from 'lucide-react';

const FileEditModal = ({ file, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    file_no: '',
    file_name: '',
    current: '',
    record: '',
    completed: '',
    remark: '',
    sub_files: [],
  });

  // When the modal opens, populate the form if we are editing an existing file
  useEffect(() => {
    if (file) {
      setFormData({
        file_no: file.file_no || '',
        file_name: file.file_name || '',
        current: file.current || '',
        record: file.record || '',
        completed: file.completed || '',
        remark: file.remark || '',
        // Ensure sub_files is always an array to prevent errors
        sub_files: file.sub_files || [],
      });
    }
  }, [file]);

  // Handle changes for top-level form fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle changes for fields within a specific sub-file
  const handleSubFileChange = (index, e) => {
    const { name, value } = e.target;
    const newSubFiles = [...formData.sub_files];
    newSubFiles[index] = { ...newSubFiles[index], [name]: value };
    setFormData(prev => ({ ...prev, sub_files: newSubFiles }));
  };

  // Add a new, empty sub-file object to the array
  const addSubFile = () => {
    setFormData(prev => ({ ...prev, sub_files: [...prev.sub_files, { name: '', current: '', record: '', completed: '', remark: '' }] }));
  };
  
  // Remove a sub-file from the array by its index
  const removeSubFile = (index) => {
    const newSubFiles = formData.sub_files.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, sub_files: newSubFiles }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Before saving, filter out any sub-files that are completely empty
    const finalFormData = {
        ...formData,
        sub_files: formData.sub_files.filter(sub => sub.name && sub.name.trim() !== '')
    };
    onSave(finalFormData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content form-modal">
        <button onClick={onClose} className="modal-close-btn"><X size={24} /></button>
        <h2 className="modal-title">{file ? 'Edit File Record' : 'Add New File Record'}</h2>
        <form onSubmit={handleSubmit} className="file-form">
          {/* Main file details */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="file_no">File No</label>
              <input type="text" id="file_no" name="file_no" value={formData.file_no} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="file_name">File Name</label>
              <input type="text" id="file_name" name="file_name" value={formData.file_name} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group"><label>Current</label><input type="text" name="current" value={formData.current} onChange={handleChange} /></div>
            <div className="form-group"><label>Record</label><input type="text" name="record" value={formData.record} onChange={handleChange} /></div>
            <div className="form-group"><label>Completed</label><input type="text" name="completed" value={formData.completed} onChange={handleChange} /></div>
          </div>

          <div className="form-group">
            <label>Remark</label>
            <textarea name="remark" value={formData.remark} onChange={handleChange}></textarea>
          </div>
          
          {/* Sub-files section */}
          <div className="sub-files-section">
            <h3>Sub-Files</h3>
            {formData.sub_files.map((sub, index) => (
              <div key={index} className="sub-file-row">
                <input type="text" name="name" placeholder="Sub-file name" value={sub.name || ''} onChange={(e) => handleSubFileChange(index, e)} />
                <input type="text" name="current" placeholder="Status (e.g., CURRENT)" value={sub.current || ''} onChange={(e) => handleSubFileChange(index, e)} />
                <button type="button" className="remove-sub-btn" title="Remove Sub-file" onClick={() => removeSubFile(index)}><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" className="add-sub-btn" onClick={addSubFile}><Plus size={16} /> Add Sub-File</button>
          </div>

          <button type="submit" className="modal-submit-btn"><Save size={16} /> Save Record</button>
        </form>
      </div>
    </div>
  );
};

export default FileEditModal;

