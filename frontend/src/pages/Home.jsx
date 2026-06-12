import React, { useState } from 'react';
import { MapPin, Zap, Shield, Clock } from 'lucide-react';
import Login from './Login';
import Register from './Register';
import './Home.css';

const features = [
  { icon: Zap, color: 'blue', iconColor: '#60a5fa', title: 'Instant Booking', desc: 'Request rides in seconds with real-time driver matching' },
  { icon: Shield, color: 'violet', iconColor: '#a78bfa', title: 'Safe & Verified', desc: 'All drivers are verified IIT Roorkee campus staff' },
  { icon: Clock, color: 'emerald', iconColor: '#34d399', title: 'Schedule Ahead', desc: 'Plan daily commutes with recurring ride scheduling' },
];

const Home = () => {
  const [authMode, setAuthMode] = useState('login');

  return (
    <div className="home-wrapper">
      <div className="home-left">
        <header className="home-logo">
          <div className="home-logo-icon">
            <MapPin size={22} color="#ffffff" />
          </div>
          <span className="home-logo-text">HopOn</span>
        </header>

        <main className="home-main">
          <div className="home-badge">
            <div className="home-badge-dot" />
            IIT Roorkee Campus
          </div>

          <h1 className="home-heading">
            Campus rides,<br />
            <span>simplified.</span>
          </h1>

          <p className="home-subtitle">
            Book e-rickshaw rides across the IIT Roorkee campus instantly.
            Track your driver live on the map, pay digitally, and never
            wait at a random stop again.
          </p>

          <div className="home-features">
            {features.map((f, i) => (
              <div key={i} className="home-feature">
                <div className={`home-feature-icon ${f.color}`}>
                  <f.icon size={18} color={f.iconColor} />
                </div>
                <div>
                  <div className="home-feature-title">{f.title}</div>
                  <div className="home-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="home-stats">
            <div>
              <div className="home-stat-value">500+</div>
              <div className="home-stat-label">Daily Rides</div>
            </div>
            <div>
              <div className="home-stat-value">50+</div>
              <div className="home-stat-label">Active Drivers</div>
            </div>
            <div>
              <div className="home-stat-value">₹10</div>
              <div className="home-stat-label">Flat Fare</div>
            </div>
          </div>
        </main>

        <footer className="home-footer">
          &copy; {new Date().getFullYear()} HopOn &middot; Built for IIT Roorkee
        </footer>
      </div>

      <div className="home-right">
        <div className="home-auth-card">
          {authMode === 'login' ? (
            <Login toggleMode={setAuthMode} />
          ) : (
            <Register toggleMode={setAuthMode} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
