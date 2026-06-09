const { Server } = require('socket.io');

let io;

exports.initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // For development
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // Join room based on user ID or role
    socket.on('join', ({ userId, role }) => {
      socket.join(userId); // Join personal room
      if (role === 'driver') {
        socket.join('drivers'); // Drivers join a common room for broadcasts
      }
      console.log(`User ${userId} (${role}) joined rooms`);
    });

    socket.on('driver:locationUpdate', ({ userId, location }) => {
      // Broadcast location to passengers tracking this driver
      io.emit(`driverLocation:${userId}`, location);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
