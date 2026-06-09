import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { MapPin, Navigation, LogOut, Clock, Star, CreditCard, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { QRCodeSVG } from 'qrcode.react';

// Location Selector Hook Component
const LocationSelector = ({ selectingLocation, setPickupCoords, setDestCoords, setPickup, setDestination, setSelectingLocation }) => {
  useMapEvents({
    click(e) {
      if (!selectingLocation) return;
      const { lat, lng } = e.latlng;
      
      // Fetch address from Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(res => res.json())
        .then(data => {
          const address = data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          if (selectingLocation === 'pickup') {
            setPickupCoords({ lat, lng });
            setPickup(address);
          } else if (selectingLocation === 'destination') {
            setDestCoords({ lat, lng });
            setDestination(address);
          }
          setSelectingLocation(null);
        })
        .catch(() => {
          const fallbackAddress = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          if (selectingLocation === 'pickup') {
            setPickupCoords({ lat, lng });
            setPickup(fallbackAddress);
          } else if (selectingLocation === 'destination') {
            setDestCoords({ lat, lng });
            setDestination(fallbackAddress);
          }
          setSelectingLocation(null);
        });
    },
  });
  return null;
};

const PassengerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [selectingLocation, setSelectingLocation] = useState(null); // 'pickup' | 'destination' | null
  
  const [scheduledTime, setScheduledTime] = useState('');
  const [isDaily, setIsDaily] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);

  // Modals state
  const [showRating, setShowRating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [completedRideData, setCompletedRideData] = useState(null);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get('http://localhost:5000/api/rides', config);
        
        // Filter history (completed/cancelled)
        const past = res.data.filter(r => ['Completed', 'Cancelled'].includes(r.status));
        setRideHistory(past);

        // Filter upcoming vs active
        const now = new Date();
        const active = res.data.find(r => ['Requested', 'Accepted', 'In Progress'].includes(r.status) && (!r.scheduledTime || new Date(r.scheduledTime) <= now));
        const upcoming = res.data.filter(r => ['Requested', 'Accepted'].includes(r.status) && r.scheduledTime && new Date(r.scheduledTime) > now);
        
        if (active) setCurrentRide(active);
        setUpcomingRides(upcoming);
        
        const unpaidRide = res.data.find(r => r.status === 'Completed' && r.paymentStatus === 'Pending');
        if (unpaidRide) {
          setCompletedRideData(unpaidRide);
          setShowPayment(true);
        }

        const drvRes = await axios.get('http://localhost:5000/api/drivers/available', config);
        setAvailableDrivers(drvRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRides();
  }, [user.token]);

  useEffect(() => {
    if (socket) {
      socket.on('ride:accepted', (ride) => setCurrentRide(ride));
      socket.on('ride:updated', (ride) => {
        if (ride.status === 'Completed') {
          setCurrentRide(null);
          setCompletedRideData(ride);
          setShowPayment(true); 
        } else if (ride.status === 'Cancelled') {
          setCurrentRide(null);
          alert('Ride was cancelled.');
        } else {
          setCurrentRide(ride);
        }
      });
      socket.on('driver:availability', (driver) => {
        setAvailableDrivers(prev => {
          if (driver.isOnline) {
             const exists = prev.find(d => d._id === driver._id);
             return exists ? prev.map(d => d._id === driver._id ? driver : d) : [...prev, driver];
          } else {
             return prev.filter(d => d._id !== driver._id);
          }
        });
      });
    }
    return () => {
      if (socket) {
        socket.off('ride:accepted');
        socket.off('ride:updated');
        socket.off('driver:availability');
      }
    };
  }, [socket]);

  const handleRequestRide = async (e) => {
    e.preventDefault();
    if (!pickupCoords || !destCoords) {
      alert("Please select pickup and destination locations on the map, or ensure coordinates are loaded.");
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        pickup: { address: pickup, lat: pickupCoords.lat, lng: pickupCoords.lng },
        destination: { address: destination, lat: destCoords.lat, lng: destCoords.lng },
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        isDaily
      };
      const res = await axios.post('http://localhost:5000/api/rides', payload, config);
      
      if (payload.scheduledTime && new Date(payload.scheduledTime) > new Date()) {
        if (Array.isArray(res.data)) {
           setUpcomingRides(prev => [...prev, ...res.data]);
        } else {
           setUpcomingRides(prev => [...prev, res.data]);
        }
        alert(isDaily ? "Daily rides scheduled for the next 5 days!" : "Ride scheduled successfully!");
        setScheduledTime('');
        setIsDaily(false);
      } else {
        setCurrentRide(res.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to request ride: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('http://localhost:5000/api/payments/process', {
        rideId: completedRideData._id,
        amount: completedRideData.fare,
        method: 'UPI'
      }, config);
      setShowPayment(false);
      setShowRating(true);
    } catch (err) {
      alert('Payment failed');
    }
  };

  const handleRatingSubmit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`http://localhost:5000/api/rides/${completedRideData._id}/rate`, {
        rating: ratingVal,
        feedback
      }, config);
      setShowRating(false);
      setCompletedRideData(null);
      alert('Thank you for your feedback!');
    } catch (err) {
      alert('Failed to submit rating');
    }
  };

  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: user.name, email: user.email });

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
          <h1>Welcome, {user.name}</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Passenger Dashboard</p>
        </div>
        <div>
          <button className="btn btn-secondary" style={{marginRight: '10px'}} onClick={() => setShowProfile(true)}>Edit Profile</button>
          <button className="btn btn-danger" onClick={logout}><LogOut size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Logout</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h2 style={{marginTop: 0, color: 'var(--primary)'}}><Navigation size={20} style={{marginRight: 8, verticalAlign: 'middle'}}/>Request a Ride</h2>
          
          {currentRide ? (
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <h3>Current Ride Status</h3>
              <span className={`status-badge status-${currentRide.status.toLowerCase().replace(' ', '')}`}>
                {currentRide.status}
              </span>
              <div style={{ margin: '15px 0' }}>
                <p><strong>From:</strong> {currentRide.pickup.address}</p>
                <p><strong>To:</strong> {currentRide.destination.address}</p>
                <p><strong>Fare:</strong> ₹{currentRide.fare}</p>
                {currentRide.scheduledTime && (
                  <p><strong>Scheduled:</strong> {new Date(currentRide.scheduledTime).toLocaleString()}</p>
                )}
                {currentRide.driverId && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <p style={{margin: '0 0 5px 0'}}><strong>Driver:</strong> {currentRide.driverId.name}</p>
                    <p style={{margin: 0}}><strong>Vehicle:</strong> {currentRide.driverId.vehicle?.plateNumber}</p>
                  </div>
                )}
              </div>
              {['Requested', 'Accepted'].includes(currentRide.status) && (
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%', marginTop: '10px' }}
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to cancel this ride?")) {
                      try {
                        const config = { headers: { Authorization: `Bearer ${user.token}` } };
                        await axios.put(`http://localhost:5000/api/rides/${currentRide._id}/status`, { status: 'Cancelled' }, config);
                        // The socket will receive 'ride:updated' and clear currentRide automatically
                      } catch (err) {
                        alert("Failed to cancel ride");
                      }
                    }
                  }}
                >
                  Cancel Ride
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleRequestRide}>
              <div className="form-group">
                <label>Pickup Location</label>
                <div style={{display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                  <MapPin size={20} style={{marginLeft: '10px', color: 'var(--text-muted)'}}/>
                  <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} required placeholder="Select on map or type" style={{border: 'none', background: 'transparent', flex: 1}}/>
                  <button type="button" className={`btn ${selectingLocation === 'pickup' ? 'btn-success' : 'btn-secondary'}`} style={{padding: '5px 10px', margin: '5px'}} onClick={() => setSelectingLocation('pickup')}>
                    <Crosshair size={16}/>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Destination</label>
                <div style={{display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                  <Navigation size={20} style={{marginLeft: '10px', color: 'var(--text-muted)'}}/>
                  <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="Select on map or type" style={{border: 'none', background: 'transparent', flex: 1}}/>
                  <button type="button" className={`btn ${selectingLocation === 'destination' ? 'btn-success' : 'btn-secondary'}`} style={{padding: '5px 10px', margin: '5px'}} onClick={() => setSelectingLocation('destination')}>
                    <Crosshair size={16}/>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Schedule Time (Optional)</label>
                <div style={{display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
                  <Clock size={20} style={{marginLeft: '10px', color: 'var(--text-muted)'}}/>
                  <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={{border: 'none', background: 'transparent'}}/>
                </div>
                {scheduledTime && (
                  <div style={{marginTop: '10px', display: 'flex', alignItems: 'center'}}>
                    <input type="checkbox" id="isDaily" checked={isDaily} onChange={(e) => setIsDaily(e.target.checked)} style={{marginRight: '8px', width: '16px', height: '16px'}} />
                    <label htmlFor="isDaily" style={{fontSize: '14px', color: 'var(--warning)', margin: 0, cursor: 'pointer'}}>Make this a Daily ride (schedules next 5 days)</label>
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '10px'}} disabled={loading || !pickupCoords || !destCoords}>
                {loading ? 'Requesting...' : 'Find a Driver'}
              </button>
            </form>
          )}
        </div>

        <div className="card" style={{ position: 'relative' }}>
          <h2 style={{marginTop: 0, color: 'var(--secondary)'}}>Live Map</h2>
          {selectingLocation && (
             <div style={{position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'var(--warning)', color: '#000', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold'}}>
                Click map to select {selectingLocation}
             </div>
          )}
          <div style={{ height: '350px', borderRadius: '10px', overflow: 'hidden' }}>
            <MapContainer center={[29.8649, 77.8966]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationSelector 
                selectingLocation={selectingLocation} 
                setPickupCoords={setPickupCoords} 
                setDestCoords={setDestCoords} 
                setPickup={setPickup} 
                setDestination={setDestination} 
                setSelectingLocation={setSelectingLocation}
              />
              
              {/* Show current ride markers & route */}
              {currentRide && (
                <>
                  <Marker position={[currentRide.pickup.lat, currentRide.pickup.lng]}>
                    <Popup>Pickup: {currentRide.pickup.address}</Popup>
                  </Marker>
                  <Marker position={[currentRide.destination.lat, currentRide.destination.lng]}>
                    <Popup>Dropoff: {currentRide.destination.address}</Popup>
                  </Marker>
                  <Polyline 
                    positions={[
                      [currentRide.pickup.lat, currentRide.pickup.lng],
                      [currentRide.destination.lat, currentRide.destination.lng]
                    ]} 
                    color="var(--primary)" 
                    weight={4} 
                    opacity={0.7} 
                    dashArray="10, 10" 
                  />
                </>
              )}

              {/* Show draft markers & draft route while requesting */}
              {!currentRide && pickupCoords && (
                 <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
                   <Popup>Selected Pickup</Popup>
                 </Marker>
              )}
              {!currentRide && destCoords && (
                 <Marker position={[destCoords.lat, destCoords.lng]}>
                   <Popup>Selected Destination</Popup>
                 </Marker>
              )}
              {!currentRide && pickupCoords && destCoords && (
                  <Polyline 
                    positions={[
                      [pickupCoords.lat, pickupCoords.lng],
                      [destCoords.lat, destCoords.lng]
                    ]} 
                    color="var(--warning)" 
                    weight={3} 
                    opacity={0.5} 
                    dashArray="5, 10" 
                  />
              )}

              {/* Show available drivers */}
              {!currentRide && availableDrivers.map(d => d.currentLocation && (
                <Marker key={d._id} position={[d.currentLocation.lat, d.currentLocation.lng]}>
                  <Popup>
                    <strong>Available Driver: {d.name}</strong><br/>
                    Vehicle: {d.vehicle?.type} ({d.vehicle?.plateNumber})<br/>
                    Rating: {d.averageRating ? d.averageRating.toFixed(1) : 'New'} ⭐
                  </Popup>
                </Marker>
              ))}

            </MapContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
        {/* Upcoming Bookings */}
        <div className="card">
          <h2 style={{marginTop: 0, color: 'var(--secondary)'}}><Clock size={20} style={{marginRight: 8, verticalAlign: 'middle'}}/>Upcoming Bookings</h2>
          {upcomingRides.length > 0 ? (
             <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
               {upcomingRides.map(ride => (
                 <div key={ride._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--warning)' }}><strong>{new Date(ride.scheduledTime).toLocaleString()}</strong></p>
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>From: {ride.pickup.address.split(',')[0]}</p>
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>To: {ride.destination.address.split(',')[0]}</p>
                   <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Status: {ride.status}</p>
                 </div>
               ))}
             </div>
          ) : (
             <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No upcoming bookings.</p>
          )}
        </div>

        {/* Payment & Ride History */}
        <div className="card">
          <h2 style={{marginTop: 0, color: 'var(--secondary)'}}><CreditCard size={20} style={{marginRight: 8, verticalAlign: 'middle'}}/>Activity & Payments History</h2>
          {rideHistory.length > 0 ? (
            <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Route</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Fare</th>
                    <th style={{ padding: '10px' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {rideHistory.map(ride => (
                    <tr key={ride._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>{new Date(ride.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '10px', fontSize: '14px' }}>{ride.pickup.address.split(',')[0]} &rarr; {ride.destination.address.split(',')[0]}</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`status-badge status-${ride.status.toLowerCase().replace(' ', '')}`} style={{ padding: '4px 8px', fontSize: '12px' }}>
                          {ride.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--success)' }}>₹{ride.fare}</td>
                      <td style={{ padding: '10px' }}>
                        {ride.status === 'Completed' ? (
                           <span style={{ color: ride.paymentStatus === 'Completed' ? 'var(--success)' : 'var(--warning)', fontSize: '12px' }}>
                             {ride.paymentStatus || 'Pending'}
                           </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No past activity.</p>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && completedRideData && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '400px', textAlign: 'center'}}>
            <CreditCard size={40} color="var(--primary)" style={{marginBottom: '10px'}}/>
            <h2 style={{margin: '0 0 10px 0'}}>Payment Due</h2>
            <p>Your ride is completed. Please pay the driver.</p>
            <h1 style={{color: 'var(--success)'}}>₹{completedRideData.fare}</h1>
            <div style={{background: '#fff', padding: '15px', display: 'inline-block', borderRadius: '10px', margin: '15px 0'}}>
               <QRCodeSVG value={`upi://pay?pa=driver@upi&pn=CampusDriver&am=${completedRideData.fare}`} size={150} />
            </div>
            <button className="btn btn-primary" style={{width: '100%'}} onClick={handlePayment}>
              Simulate UPI Payment Success
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '400px', textAlign: 'center'}}>
            <Star size={40} color="var(--warning)" style={{marginBottom: '10px'}}/>
            <h2 style={{margin: '0 0 10px 0'}}>Rate your Ride</h2>
            <div style={{display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0'}}>
              {[1, 2, 3, 4, 5].map(num => (
                <Star 
                  key={num} 
                  size={30} 
                  color={ratingVal >= num ? 'var(--warning)' : '#444'} 
                  onClick={() => setRatingVal(num)}
                  style={{cursor: 'pointer'}}
                />
              ))}
            </div>
            <textarea 
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Leave feedback (optional)"
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '15px'}}
              rows={3}
            />
            <button className="btn btn-success" style={{width: '100%'}} onClick={handleRatingSubmit}>
              Submit Rating
            </button>
          </div>
        </div>
      )}

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
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>Email</label>
                <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} style={{width: '100%', padding: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none'}} />
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

export default PassengerDashboard;
