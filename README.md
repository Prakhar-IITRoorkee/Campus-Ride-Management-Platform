# Campus Mobility Platform

## Project Overview
The Campus Mobility Platform is a comprehensive, real-time web application designed to facilitate seamless transportation within university campuses. Modeled after modern ride-sharing platforms, it connects passengers (students, faculty, staff) with drivers (e.g., campus e-rickshaws) in real-time. The platform ensures secure user authentication, precise location selection via interactive maps, live ride status tracking, and driver availability management, making campus commutes safer, faster, and more efficient.

## Technology Stack
The application is built using the **MERN** stack along with modern real-time communication tools:

**Frontend:**
- **React.js** (Vite) - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time WebSocket communication
- **React-Leaflet / OpenStreetMap** - Interactive live maps and reverse geocoding
- **Recharts** - Data visualization and analytics
- **Lucide-React** - Iconography

**Backend:**
- **Node.js & Express.js** - Server environment and RESTful API framework
- **MongoDB & Mongoose** - NoSQL database (configured as an in-memory database for rapid prototyping/testing)
- **Socket.IO** - WebSocket server for real-time ride tracking and driver availability
- **JSON Web Tokens (JWT) & bcryptjs** - Secure authentication and password hashing

## Setup Instructions
To set up the project locally, ensure you have Node.js and npm installed.

1. **Clone or navigate to the project directory:**
   ```bash
   cd campus-mobility
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

## Running the Application
The application requires both the backend API server and the frontend development server to be running simultaneously.

1. **Start the Backend Server:**
   Open a terminal, navigate to the backend directory, and start the Node.js server:
   ```bash
   cd backend
   npm run dev
   # The server will start on http://localhost:5000
   ```

2. **Start the Frontend Server:**
   Open a second terminal, navigate to the frontend directory, and start the Vite development server:
   ```bash
   cd frontend
   npm run dev
   # The frontend will be accessible at http://localhost:5173
   ```

3. **Usage Note:**
   Because the backend currently utilizes an **in-memory MongoDB database** (`mongodb-memory-server`) to simplify the initial setup and eliminate external dependencies, all data (users, rides) is cleared when the backend server stops. You will need to create new accounts via the "Sign Up" page each time the server starts.

## Feature List

### User Authentication
- Secure JWT-based Registration and Login.
- Role-based access control (`Passenger` vs `Driver`).
- Driver-specific onboarding requiring Vehicle Details and ID/License Verification.
- Profile management and editing capabilities.

### Real-Time Ride Workflow
- **Live Map Integration:** Passengers can click on the map to select precise pickup and drop-off coordinates, which automatically reverse-geocode into street addresses.
- **WebSocket Communication:** Ride requests, driver acceptances, and status updates (`Requested` ➔ `Accepted` ➔ `In Progress` ➔ `Completed` / `Cancelled`) are broadcasted instantly without page reloads.
- **Atomic Assignment:** The backend ensures that a requested ride can only be assigned to a single driver, preventing conflicts.

### Driver Availability Management
- Drivers can toggle their `Online` or `Offline` status.
- **Live Map Visibility:** Online drivers are instantly populated on the passengers' maps in real-time.

### Ride Scheduling & Tracking
- Passengers can request immediate rides or schedule rides for future time slots (e.g., early morning classes).
- Passengers can manage "Upcoming Bookings" separately from immediate active rides.

### Dashboard & Analytics
- **Driver Dashboard:** Displays an Activity Table with full ride history, average star ratings, total rides completed, and a live chart visualizing recent earnings.
- **Passenger Dashboard:** Displays an Activity & Payments History table alongside upcoming scheduled bookings.

### Ratings, Feedback & Digital Payments
- Passengers are prompted with an interactive modal to submit a 1-5 star rating and written feedback upon ride completion.
- Simulated UPI/QR Code digital payment gateway integration for fare settlement.
