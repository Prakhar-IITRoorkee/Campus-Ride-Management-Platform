import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import Home from './pages/Home';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/dashboard" />;

  return children;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              {user?.role === 'driver' ? <DriverDashboard /> : <PassengerDashboard />}
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
