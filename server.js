const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Store active rooms and users
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', (roomName, displayName) => {
    try {
      console.log(`🎯 ${socket.id} joining room ${roomName} as ${displayName}`);

      // Leave previous rooms
      for (const r of socket.rooms) {
        if (r !== socket.id) socket.leave(r);
      }

      socket.join(roomName);

      if (!rooms.has(roomName)) rooms.set(roomName, new Map());
      const room = rooms.get(roomName);

      // Add/update user
      room.set(socket.id, {
        id: socket.id,
        displayName: displayName || `User${socket.id.substring(0, 6)}`
      });

      console.log(`📊 Room ${roomName} has ${room.size} users`);

      // Send the full room user list (including self)
      socket.emit('room-joined', Array.from(room.values()));

      // Notify others about new user
      socket.to(roomName).emit('user-connected', socket.id, displayName);
    } catch (err) {
      console.error('❌ Error join-room:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('offer', ({ offer, to, room }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to, room }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to, room }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('chat-message', ({ room, message, userName }) => {
    socket.to(room).emit('chat-message', {
      message, userId: socket.id, userName
    });
  });

  socket.on('user-media-update', ({ room, video, audio }) => {
    socket.to(room).emit('user-media-update', {
      userId: socket.id, video, audio
    });
  });

  socket.on('update-display-name', ({ room, displayName }) => {
    if (rooms.has(room)) {
      const roomData = rooms.get(room);
      if (roomData.has(socket.id)) {
        roomData.get(socket.id).displayName = displayName;
      }
    }
    socket.to(room).emit('update-display-name', {
      userId: socket.id, displayName
    });
  });

  socket.on('leave-room', (roomName) => handleUserLeave(roomName, socket.id));
  socket.on('disconnect', () => {
    rooms.forEach((users, roomName) => {
      if (users.has(socket.id)) handleUserLeave(roomName, socket.id);
    });
  });

  function handleUserLeave(roomName, userId) {
    if (!rooms.has(roomName)) return;
    const room = rooms.get(roomName);
    if (room.has(userId)) {
      room.delete(userId);
      console.log(`⬅️ ${userId} left room ${roomName}`);
      socket.to(roomName).emit('user-disconnected', userId);
      if (room.size === 0) rooms.delete(roomName);
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
