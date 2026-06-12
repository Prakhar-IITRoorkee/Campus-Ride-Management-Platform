const { Server } = require('socket.io');

let io;

exports.initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);


    socket.on('join', ({ userId, role }) => {
      socket.join(userId);
      if (role === 'driver') {
        socket.join('drivers');
      }
      console.log(`User ${userId} (${role}) joined rooms`);
    });

    socket.on('driver:locationUpdate', ({ userId, location }) => {

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
