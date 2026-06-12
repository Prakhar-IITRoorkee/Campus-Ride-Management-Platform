import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css';

const Login = ({ toggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      setError('Google Login failed');
    }
  };

  return (
    <div className="auth-card">
      <h2>Login to HopOn</h2>
      <p className="subtitle">Welcome back to the campus ride system</p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" className="primary-btn">Log In</button>
      </form>

      <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google Login Failed')}
          theme="filled_black"
        />
      </div>

      <p className="redirect-text" style={{ textAlign: 'center', marginTop: '20px' }}>
        Don't have an account? <span onClick={() => toggleMode('register')} style={{color: 'var(--primary)', cursor: 'pointer', fontWeight: 600}}>Sign up</span>
      </p>
    </div>
  );
};

export default Login;
