import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'passenger',
    vehicleType: '',
    plateNumber: ''
  });
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        vehicle: formData.role === 'driver' ? {
          type: formData.vehicleType,
          plateNumber: formData.plateNumber
        } : undefined,
        verificationId: formData.role === 'driver' ? formData.verificationId : undefined
      };
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Join Campus Mobility</h2>
        <p className="subtitle">Create an account to get started</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          
          {formData.role === 'driver' && (
            <>
              <div className="input-group">
                <label>Vehicle Type</label>
                <input type="text" name="vehicleType" placeholder="e.g., e-rickshaw" value={formData.vehicleType} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Plate Number</label>
                <input type="text" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Driver License / ID Number</label>
                <input type="text" name="verificationId" value={formData.verificationId || ''} onChange={handleChange} required />
              </div>
            </>
          )}

          <button type="submit" className="primary-btn">Sign Up</button>
        </form>
        <p className="redirect-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
