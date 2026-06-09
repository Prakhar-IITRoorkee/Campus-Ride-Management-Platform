import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { Power, MapPin, CheckCircle, XCircle, LogOut, Star, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DriverDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [isOnline, setIsOnline] = useState(user.isOnline || false);
  const [activeRide, setActiveRide] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [driverProfile, setDriverProfile] = useState(user);
  const [history, setHistory] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        // Fetch active rides
        const rideRes = await axios.get('http://localhost:5000/api/rides', config);
        const active = rideRes.data.find(r => ['Accepted', 'In Progress'].includes(r.status));
        if (active) setActiveRide(active);
        
        // Fetch history for analytics
        const pastRides = rideRes.data.filter(r => ['Completed', 'Cancelled'].includes(r.status));
        setFullHistory(pastRides);
        
        const completed = pastRides.filter(r => r.status === 'Completed').slice(0, 7);
        setHistory(completed.map((r, i) => ({ name: `Ride ${i+1}`, fare: r.fare })));

        // Fetch latest profile stats
        const profileRes = await axios.get('http://localhost:5000/api/auth/me', config);
        setDriverProfile(profileRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user.token]);

  useEffect(() => {
    if (socket) {
      socket.on('ride:requested', (ride) => {
        if (isOnline && !activeRide) setRideRequests(prev => [...prev, ride]);
      });
      socket.on('ride:updated', (ride) => {
        setRideRequests(prev => prev.filter(r => r._id !== ride._id));
      });
    }
    return () => {
      if (socket) {
        socket.off('ride:requested');
        socket.off('ride:updated');
      }
    };
  }, [socket, isOnline, activeRide]);

  const toggleOnline = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      // Generate a mock location near IIT Roorkee if going online
      const payload = { 
        isOnline: !isOnline,
        currentLocation: !isOnline ? {
          lat: 29.8649 + (Math.random() - 0.5) * 0.02,
          lng: 77.8966 + (Math.random() - 0.5) * 0.02
        } : null
      };
      const res = await axios.put('http://localhost:5000/api/drivers/availability', payload, config);
      setIsOnline(res.data.isOnline);
      if (!res.data.isOnline) setRideRequests([]);
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  const acceptRide = async (rideId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.put(`http://localhost:5000/api/rides/${rideId}/accept`, {}, config);
      setActiveRide(res.data);
      setRideRequests([]);
    } catch (err) {
      alert('Failed to accept ride. It might be taken.');
      setRideRequests(prev => prev.filter(r => r._id !== rideId));
    }
  };

  const updateRideStatus = async (status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.put(`http://localhost:5000/api/rides/${activeRide._id}/status`, { status }, config);
      if (status === 'Completed' || status === 'Cancelled') {
        setActiveRide(null);
        setFullHistory(prev => [{...activeRide, status}, ...prev]);
        // Refresh profile stats if completed
        if (status === 'Completed') {
           const profileRes = await axios.get('http://localhost:5000/api/auth/me', config);
           setDriverProfile(profileRes.data);
           setHistory(prev => [...prev, { name: 'New', fare: activeRide.fare }]);
        }
      } else {
        setActiveRide(res.data);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({ 
    name: user.name, 
    email: user.email, 
    vehicle: { type: user.vehicle?.type || '', plateNumber: user.vehicle?.plateNumber || '' } 
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put('http://localhost:5000/api/auth/profile', profileData, config);
      alert('Profile updated successfully! Please re-login to see changes.');
      setShowProfile(false);
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <div>
          <h1>Driver Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{driverProfile.name} - {driverProfile.vehicle?.plateNumber}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowProfile(true)}>Edit Profile</button>
          <button className={`btn ${isOnline ? 'btn-success' : 'btn-danger'}`} onClick={toggleOnline}>
            <Power size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
          <button className="btn btn-danger" onClick={logout}><LogOut size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Logout</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
         <div className="card" style={{textAlign: 'center', padding: '15px'}}>
            <Star size={30} color="var(--warning)" style={{marginBottom: '5px'}}/>
            <h3 style={{margin: 0}}>{driverProfile.averageRating ? driverProfile.averageRating.toFixed(1) : 'N/A'}</h3>
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '12px'}}>Average Rating</p>
         </div>
         <div className="card" style={{textAlign: 'center', padding: '15px'}}>
            <TrendingUp size={30} color="var(--success)" style={{marginBottom: '5px'}}/>
            <h3 style={{margin: 0}}>{driverProfile.totalRides || 0}</h3>
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '12px'}}>Total Rides</p>
         </div>
         <div className="card" style={{textAlign: 'center', padding: '15px'}}>
            <CheckCircle size={30} color="var(--primary)" style={{marginBottom: '5px'}}/>
            <h3 style={{margin: 0}}>₹{history.reduce((acc, curr) => acc + (curr.fare||0), 0)}</h3>
            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '12px'}}>Recent Earnings</p>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h2 style={{marginTop: 0, color: 'var(--primary)'}}>Current Ride</h2>
          {activeRide ? (
            <div>
              <span className={`status-badge status-${activeRide.status.toLowerCase().replace(' ', '')}`}>
                {activeRide.status}
              </span>
              <div style={{ margin: '20px 0' }}>
                <p><strong>Passenger:</strong> {activeRide.passengerId.name}</p>
                <p><strong>From:</strong> {activeRide.pickup.address}</p>
                <p><strong>To:</strong> {activeRide.destination.address}</p>
                <p><strong>Fare:</strong> ₹{activeRide.fare}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {activeRide.status === 'Accepted' && (
                  <button className="btn btn-primary" onClick={() => updateRideStatus('In Progress')}>Start Ride</button>
                )}
                {activeRide.status === 'In Progress' && (
                  <button className="btn btn-success" onClick={() => updateRideStatus('Completed')}>Complete Ride</button>
                )}
                <button className="btn btn-danger" onClick={() => updateRideStatus('Cancelled')}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              <p>{isOnline ? 'Waiting for ride requests...' : 'Go online to receive ride requests'}</p>
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{marginTop: 0, color: 'var(--secondary)'}}>Requests & Analytics</h2>
          {rideRequests.length > 0 ? (
            <div>
              {rideRequests.map(ride => (
                <div key={ride._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                  <p style={{ margin: '0 0 5px 0' }}><strong>{ride.passengerId?.name || 'Passenger'}</strong> (₹{ride.fare})</p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <MapPin size={14} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
                    {ride.pickup.address} &rarr; {ride.destination.address}
                  </p>
                  {ride.scheduledTime && <p style={{ fontSize: '12px', color: 'var(--warning)', margin: '5px 0 0 0' }}>Scheduled: {new Date(ride.scheduledTime).toLocaleString()}</p>}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => acceptRide(ride._id)}>Accept</button>
                    <button className="btn btn-danger" onClick={() => setRideRequests(prev => prev.filter(r => r._id !== ride._id))}><XCircle size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div style={{ flex: 1, marginTop: '20px' }}>
               <h4 style={{ color: 'var(--text-muted)', marginTop: 0 }}>Recent Earnings Chart</h4>
               <ResponsiveContainer width="100%" height={200}>
                 <LineChart data={history}>
                   <XAxis dataKey="name" stroke="#bbbbbb" />
                   <YAxis stroke="#bbbbbb" />
                   <Tooltip contentStyle={{ backgroundColor: '#2a2a40', border: 'none', borderRadius: '8px', color: '#fff' }} />
                   <Line type="monotone" dataKey="fare" stroke="var(--secondary)" strokeWidth={3} />
                 </LineChart>
               </ResponsiveContainer>
              </div>
           )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{marginTop: 0, color: 'var(--secondary)'}}>Activity Table</h2>
        {fullHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '10px' }}>Date</th>
                  <th style={{ padding: '10px' }}>Passenger</th>
                  <th style={{ padding: '10px' }}>Route</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Fare</th>
                  <th style={{ padding: '10px' }}>Rating</th>
                  <th style={{ padding: '10px' }}>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {fullHistory.map(ride => (
                  <tr key={ride._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>{new Date(ride.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>{ride.passengerId?.name || 'Unknown'}</td>
                    <td style={{ padding: '10px', fontSize: '14px' }}>{ride.pickup.address.split(',')[0]} &rarr; {ride.destination.address.split(',')[0]}</td>
                    <td style={{ padding: '10px' }}>
                      <span className={`status-badge status-${ride.status.toLowerCase().replace(' ', '')}`} style={{ padding: '4px 8px', fontSize: '12px' }}>
                        {ride.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--success)' }}>₹{ride.fare}</td>
                    <td style={{ padding: '10px', color: 'var(--warning)' }}>{ride.rating ? `${ride.rating} ⭐` : '-'}</td>
                    <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.feedback || ''}>
                      {ride.feedback || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No completed or cancelled rides yet.</p>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '400px'}}>
            <h2 style={{marginTop: 0}}>Edit Profile</h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group" style={{marginBottom: '10px'}}>
                <label>Name</label>
                <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none'}} />
              </div>
              <div className="form-group" style={{marginBottom: '10px'}}>
                <label>Email</label>
                <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none'}} />
              </div>
              <div className="form-group" style={{marginBottom: '10px'}}>
                <label>Vehicle Type</label>
                <input type="text" value={profileData.vehicle.type} onChange={e => setProfileData({...profileData, vehicle: {...profileData.vehicle, type: e.target.value}})} style={{width: '100%', padding: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none'}} />
              </div>
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Plate Number</label>
                <input type="text" value={profileData.vehicle.plateNumber} onChange={e => setProfileData({...profileData, vehicle: {...profileData.vehicle, plateNumber: e.target.value}})} style={{width: '100%', padding: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none'}} />
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1}}>Save Changes</button>
                <button type="button" className="btn btn-danger" onClick={() => setShowProfile(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
