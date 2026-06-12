import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { MapPin, Navigation, LogOut, Clock, Star, CreditCard, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PassengerDashboard.css';
const rickshawIcon = new L.divIcon({
  html: `<div style="width: 70px; height: 70px; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));">
            <img src="/rickshaw_transparent.png" style="width: 100%; height: 100%; object-fit: contain;" />
         </div>`,
  className: 'custom-div-icon',
  iconSize: [70, 70],
  iconAnchor: [35, 35]
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
};

import { QRCodeSVG } from 'qrcode.react';
const LocationSelector = ({ selectingLocation, setPickupCoords, setDestCoords, setPickup, setDestination, setSelectingLocation }) => {
  useMapEvents({
    click(e) {
      if (!selectingLocation) return;
      const { lat, lng } = e.latlng;
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
  const [selectingLocation, setSelectingLocation] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isDaily, setIsDaily] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [driverRouteCoords, setDriverRouteCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
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
        const past = res.data.filter(r => ['Completed', 'Cancelled'].includes(r.status));
        setRideHistory(past);
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
        setCurrentRide(prev => {
          if (prev && prev.driverId && prev.driverId._id === driver._id) {
             return { ...prev, driverId: { ...prev.driverId, currentLocation: driver.currentLocation } };
          }
          return prev;
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
  useEffect(() => {
    const fetchRoute = async () => {
      if (currentRide && currentRide.driverId && currentRide.driverId.currentLocation) {
        const { lat: driverLat, lng: driverLng } = currentRide.driverId.currentLocation;
        let targetLat, targetLng;
        if (currentRide.status === 'Accepted' && currentRide.pickup) {
           targetLat = currentRide.pickup.lat;
           targetLng = currentRide.pickup.lng;
        } else if (currentRide.status === 'In Progress' && currentRide.destination) {
           targetLat = currentRide.destination.lat;
           targetLng = currentRide.destination.lng;
        } else {
           setDriverRouteCoords(null);
           return;
        }
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
          const response = await axios.get(url);
          if (response.data.routes && response.data.routes.length > 0) {
            const coords = response.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setDriverRouteCoords(coords);
          }
        } catch (error) {
          console.error("Failed to fetch OSRM route:", error);
        }
      } else {
        setDriverRouteCoords(null);
      }
    };
    fetchRoute();
  }, [currentRide?.driverId?.currentLocation?.lat, currentRide?.driverId?.currentLocation?.lng, currentRide?.pickup?.lat, currentRide?.pickup?.lng, currentRide?.destination?.lat, currentRide?.destination?.lng, currentRide?.status]);
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
      const { data } = await axios.post('http://localhost:5000/api/payments/create-order', {
        rideId: completedRideData._id
      }, config);
      if (!data.order || !data.order.id) {
          return alert('Could not initiate payment');
      }
      const options = {
        key: data.key_id, 
        amount: data.order.amount, 
        currency: "INR",
        name: "Campus Mobility",
        description: "Ride Fare",
        order_id: data.order.id, 
        handler: async function (response) {
          try {
            await axios.post('http://localhost:5000/api/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              rideId: completedRideData._id
            }, config);
            setShowPayment(false);
            setShowRating(true);
          } catch (verifyErr) {
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: user.name,
          contact: "9999999999"
        },
        theme: {
          color: "#0ea5e9"
        }
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
          alert("Payment failed: " + response.error.description);
      });
      rzp1.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Payment initiation failed');
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
    <>
      <div className="passenger-navbar">
        <div className="passenger-navbar-logo">
          <div className="passenger-navbar-logo-icon">
            <MapPin size={17} color="#fff" />
          </div>
          <h2>HopOn</h2>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="passenger-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          {showProfileMenu && (
            <div className="passenger-dropdown">
               <p className="passenger-dropdown-name">{user.name}</p>
               <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '8px' }} onClick={() => { setShowProfileMenu(false); setShowProfile(true); }}>Edit Profile</button>
               <button className="btn btn-danger" style={{ width: '100%' }} onClick={logout}><LogOut size={16} style={{marginRight: 6, verticalAlign: 'middle'}} />Logout</button>
            </div>
          )}
        </div>
      </div>
      <div className="passenger-map-container">
        {selectingLocation && (
             <div className="passenger-map-toast">
                Click map to select {selectingLocation}
             </div>
        )}
        <MapContainer center={[29.8649, 77.8966]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationSelector 
            selectingLocation={selectingLocation} 
            setPickupCoords={setPickupCoords} 
            setDestCoords={setDestCoords} 
            setPickup={setPickup} 
            setDestination={setDestination} 
            setSelectingLocation={setSelectingLocation}
          />
          {currentRide && (
            <>
              <Marker position={[currentRide.pickup.lat, currentRide.pickup.lng]}>
                <Popup>Pickup: {currentRide.pickup.address}</Popup>
              </Marker>
              <Marker position={[currentRide.destination.lat, currentRide.destination.lng]}>
                <Popup>Dropoff: {currentRide.destination.address}</Popup>
              </Marker>
              {currentRide.driverId?.currentLocation && (
                <Marker position={[currentRide.driverId.currentLocation.lat, currentRide.driverId.currentLocation.lng]} icon={rickshawIcon}>
                  <Popup>Assigned Driver</Popup>
                </Marker>
              )}
              {driverRouteCoords && (
                <Polyline 
                  positions={driverRouteCoords} 
                  color="var(--success)" 
                  weight={5} 
                  opacity={0.9} 
                />
              )}
              <Polyline 
                positions={[
                  [currentRide.pickup.lat, currentRide.pickup.lng],
                  [currentRide.destination.lat, currentRide.destination.lng]
                ]} 
                color="var(--primary)" 
                weight={4} 
                opacity={0.5} 
                dashArray="10, 10" 
              />
            </>
          )}
          {(!currentRide || currentRide.status === 'Requested') && pickupCoords && (
             <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
               <Popup>Selected Pickup</Popup>
             </Marker>
          )}
          {(!currentRide || currentRide.status === 'Requested') && destCoords && (
             <Marker position={[destCoords.lat, destCoords.lng]}>
               <Popup>Selected Destination</Popup>
             </Marker>
          )}
          {(!currentRide || currentRide.status === 'Requested') && pickupCoords && destCoords && (
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
          {(!currentRide || currentRide.status === 'Requested') && availableDrivers.map(d => d.currentLocation && (
            <Marker key={d._id} position={[d.currentLocation.lat, d.currentLocation.lng]} icon={rickshawIcon}>
                <Popup>
                <strong>Available Driver: {d.name}</strong><br/>
                Vehicle: {d.vehicle?.type} ({d.vehicle?.plateNumber})<br/>
                Rating: {d.averageRating ? d.averageRating.toFixed(1) : 'New'} ⭐
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="dashboard-container">
        <div className="card passenger-ride-card" style={{ marginTop: '20px' }}>
          <h2><Navigation size={18} />Request a Ride</h2>
          {currentRide ? (
            <div className="passenger-ride-status">
              <h3>Current Ride Status</h3>
              <span className={`status-badge status-${currentRide.status.toLowerCase().replace(' ', '')}`}>
                {currentRide.status}
              </span>
              <div style={{ margin: '15px 0' }}>
                <p className="passenger-ride-detail"><strong>From:</strong> {currentRide.pickup.address}</p>
                <p className="passenger-ride-detail"><strong>To:</strong> {currentRide.destination.address}</p>
                <p className="passenger-ride-detail"><strong>Fare:</strong> ₹{currentRide.fare}</p>
                <p className="passenger-ride-detail"><strong>Distance:</strong> {calculateDistance(currentRide.pickup.lat, currentRide.pickup.lng, currentRide.destination.lat, currentRide.destination.lng).toFixed(2)} km</p>
                {currentRide.scheduledTime && (
                  <p><strong>Scheduled:</strong> {new Date(currentRide.scheduledTime).toLocaleString()}</p>
                )}
                {currentRide.driverId && (
                  <div className="passenger-driver-info">
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
              <div className="passenger-form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Pickup Location</label>
                  <div className="passenger-input-wrapper">
                    <MapPin size={18} className="passenger-input-icon" />
                    <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} required placeholder="Select on map" />
                    <button type="button" className={`btn ${selectingLocation === 'pickup' ? 'btn-success' : 'btn-secondary'}`} style={{padding: '5px 10px', margin: '5px'}} onClick={() => setSelectingLocation('pickup')}>
                      <Crosshair size={16}/>
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Destination</label>
                  <div className="passenger-input-wrapper">
                    <Navigation size={18} className="passenger-input-icon" />
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="Select on map" />
                    <button type="button" className={`btn ${selectingLocation === 'destination' ? 'btn-success' : 'btn-secondary'}`} style={{padding: '5px 10px', margin: '5px'}} onClick={() => setSelectingLocation('destination')}>
                      <Crosshair size={16}/>
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Schedule Time (Optional)</label>
                  <div className="passenger-input-wrapper">
                    <Clock size={18} className="passenger-input-icon" />
                    <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                  </div>
                  {scheduledTime && (
                    <div style={{marginTop: '10px', display: 'flex', alignItems: 'center'}}>
                      <input type="checkbox" id="isDaily" checked={isDaily} onChange={(e) => setIsDaily(e.target.checked)} style={{marginRight: '8px', width: '16px', height: '16px'}} />
                      <label htmlFor="isDaily" style={{fontSize: '14px', color: 'var(--warning)', margin: 0, cursor: 'pointer'}}>Make this a Daily ride (schedules next 5 days)</label>
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '15px'}} disabled={loading || !pickupCoords || !destCoords}>
                {loading ? 'Requesting...' : 'Find a Driver'}
              </button>
            </form>
          )}
        </div>
        <div className="passenger-section-grid">
        <div className="card">
          <h2 className="passenger-section-title"><Clock size={18} />Upcoming Bookings</h2>
          {upcomingRides.length > 0 ? (
             <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
               {upcomingRides.map(ride => (
                 <div key={ride._id} className="passenger-booking-item">
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--warning)' }}><strong>{new Date(ride.scheduledTime).toLocaleString()}</strong></p>
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>From: {ride.pickup.address.split(',')[0]}</p>
                   <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>To: {ride.destination.address.split(',')[0]}</p>
                   <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Status: {ride.status}</p>
                 </div>
               ))}
             </div>
          ) : (
             <p className="passenger-empty-state">No upcoming bookings.</p>
          )}
        </div>
        <div className="card">
          <h2 className="passenger-section-title"><CreditCard size={18} />Activity & Payments</h2>
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
            <p className="passenger-empty-state">No past activity.</p>
          )}
        </div>
      </div>
      {showPayment && completedRideData && (
        <div className="passenger-modal-overlay">
          <div className="passenger-modal-card">
            <CreditCard size={40} color="var(--primary)" style={{marginBottom: '10px'}}/>
            <h2 style={{margin: '0 0 10px 0'}}>Payment Due</h2>
            <p>Your ride is completed. Please pay the driver.</p>
            <h1 style={{color: 'var(--success)'}}>₹{completedRideData.fare}</h1>
            <div style={{background: '#fff', padding: '15px', display: 'inline-block', borderRadius: '10px', margin: '15px 0'}}>
               <QRCodeSVG value={`upi://pay?pa=driver@upi&pn=CampusDriver&am=${completedRideData.fare}`} size={150} />
            </div>
            <button className="btn btn-primary" style={{width: '100%'}} onClick={handlePayment}>
              Pay with Razorpay (UPI)
            </button>
          </div>
        </div>
      )}
      {showRating && (
        <div className="passenger-modal-overlay">
          <div className="passenger-modal-card">
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
      {showProfile && (
        <div className="passenger-modal-overlay">
          <div className="passenger-modal-card" style={{textAlign: 'left'}}>
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
    </>
  );
};
export default PassengerDashboard;
