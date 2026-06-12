# HopOn: IIT Roorkee Ride Management System

## Project Overview
HopOn is a full-stack, real-time web application designed exclusively for the IIT Roorkee campus to streamline the booking and management of local rides (e-rickshaws). It connects students and staff (passengers) with registered campus drivers through a live, map-based interface. Passengers can request instant rides or schedule daily commutes, while drivers receive real-time notifications, route optimization, and earnings analytics.

## Technology Stack
- **Frontend**: React.js (Vite), React Router v6, Axios
- **Styling**: Vanilla CSS, Lucide React (Icons)
- **Maps & Routing**: React Leaflet, OpenStreetMap, OSRM (Open Source Routing Machine)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose), MongoDB Memory Server (for easy local setup)
- **Real-Time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens), Google OAuth2, bcryptjs
- **Payments**: Razorpay UPI Integration

## Setup Instructions
1. **Prerequisites**: Ensure you have Node.js (v18+) and npm installed on your machine.
2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd campus-mobility
   ```
3. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```
4. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```
5. **Environment Variables**:
   Create a `.env` file in the `backend` directory with the following variables (or leave empty to use defaults/in-memory DB):
   ```env
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   # MONGO_URI is optional. If omitted, the app uses an in-memory MongoDB instance automatically.
   # GOOGLE_CLIENT_ID is optional for mock OAuth testing.
   ```

## Running the Application
To run the application locally, you will need two terminal windows.

**Terminal 1: Start the Backend Server**
```bash
cd backend
node server.js
```
*The server will start on http://localhost:5000*

**Terminal 2: Start the Frontend Application**
```bash
cd frontend
npm run dev
```
*The application will open on http://localhost:5173*

## Feature List
1. **Real-Time GPS Tracking**: Drivers' locations are continuously updated and broadcasted to passengers via WebSockets, animating live on the map.
2. **Split-Screen Unified Authentication**: Seamless login and registration directly on the landing page without routing changes.
3. **Role-Based Access Control**: Distinct dashboards and features for Passengers vs. Drivers.
4. **Dynamic Map Selection**: Click directly on the interactive Leaflet map to select precise pickup and drop-off coordinates.
5. **Route Visualization**: Integrated OSRM generates and draws the shortest driving route on the map for active rides.
6. **Ride Scheduling**: Ability to book rides instantly or schedule them for future times (including daily recurring bookings).
7. **Demand Analytics**: Driver dashboard features a bar chart visualizing campus demand trends by hour.
8. **Digital Payments**: Integrated Razorpay checkout with UPI QR code generation for cashless campus rides.
9. **Feedback System**: Post-ride 5-star rating and feedback system that actively affects driver profiles.
