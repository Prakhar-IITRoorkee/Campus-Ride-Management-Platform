const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { initSockets } = require('./src/sockets/socketManager');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    console.log('Using in-memory MongoDB');
  }

  mongoose.connect(uri)
    .then(() => console.log('MongoDB Connected to', uri))
    .catch(err => console.error('MongoDB Connection Error:', err));
};

connectDB();

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/rides', require('./src/routes/rideRoutes'));
app.use('/api/drivers', require('./src/routes/driverRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));

initSockets(server);

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
