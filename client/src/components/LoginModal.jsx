import React, { useState } from 'react';
import axios from 'axios';
import { X, LogIn } from 'lucide-react';

// Dynamically determine the API base URL
// Uses the Vite environment variable in production, falls back to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const LoginModal = ({ onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loginUrl = `${API_BASE_URL}/login`;
      const response = await axios.post(loginUrl, {
        username,
        password,
      });
      onLoginSuccess(response.data.token);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message); 
      } else {
        setError('Login failed. Please check credentials or server connection.'); 
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-btn">
          <X size={24} />
        </button>
        <h2 className="modal-title">Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="modal-error">{error}</p>}
          <button type="submit" className="modal-submit-btn" disabled={isLoading}>
            {isLoading ? 'Logging in...' : <><LogIn size={16} /> Login</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;