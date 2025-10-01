const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Store active rooms and users
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', (roomName, displayName) => {
    try {
      console.log(`🎯 User ${socket.id} joining room: ${roomName} as ${displayName}`);
      
      // Leave any previous rooms
      if (socket.rooms.size > 1) {
        const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        previousRooms.forEach(room => {
          socket.leave(room);
          console.log(`⬅️ User ${socket.id} left previous room: ${room}`);
        });
      }

      socket.join(roomName);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Map());
      }
      
      const room = rooms.get(roomName);
      
      // Add user to room
      room.set(socket.id, {
        id: socket.id,
        displayName: displayName || `User${socket.id.substring(0, 6)}`,
        joinedAt: new Date()
      });
      
      // Get all users in the room (excluding current user)
      const otherUsers = Array.from(room.values()).filter(user => user.id !== socket.id);
      
      console.log(`📊 Room ${roomName} now has ${room.size} users`);
      
      // Send current user list to the new user
      socket.emit('room-joined', otherUsers);
      
      // Notify other users in the room about the new user
      socket.to(roomName).emit('user-connected', socket.id, displayName);
      
      console.log(`✅ User ${socket.id} successfully joined room ${roomName}`);
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('offer', (data) => {
    try {
      const { offer, to, room } = data;
      console.log(`📨 Offer from ${socket.id} to ${to} in room ${room}`);
      socket.to(to).emit('offer', { offer, from: socket.id });
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  });

  socket.on('answer', (data) => {
    try {
      const { answer, to, room } = data;
      console.log(`📨 Answer from ${socket.id} to ${to} in room ${room}`);
      socket.to(to).emit('answer', { answer, from: socket.id });
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  });

  socket.on('ice-candidate', (data) => {
    try {
      const { candidate, to, room } = data;
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  });

  socket.on('chat-message', (data) => {
    try {
      const { room, message, userName } = data;
      console.log(`💬 Chat in ${room} from ${userName}: ${message}`);
      socket.to(room).emit('chat-message', { 
        message, 
        userId: socket.id,
        userName
      });
    } catch (error) {
      console.error('❌ Error handling chat message:', error);
    }
  });

  socket.on('user-media-update', (data) => {
    try {
      const { room, video, audio } = data;
      socket.to(room).emit('user-media-update', { 
        userId: socket.id, 
        video, 
        audio 
      });
    } catch (error) {
      console.error('❌ Error handling media update:', error);
    }
  });

  socket.on('update-display-name', (data) => {
    try {
      const { room, displayName } = data;
      
      // Update display name in room data
      if (rooms.has(room)) {
        const roomData = rooms.get(room);
        if (roomData.has(socket.id)) {
          roomData.get(socket.id).displayName = displayName;
        }
      }
      
      socket.to(room).emit('update-display-name', { 
        userId: socket.id, 
        displayName 
      });
    } catch (error) {
      console.error('❌ Error updating display name:', error);
    }
  });

  socket.on('leave-room', (roomName) => {
    handleUserLeave(roomName, socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
    
    // Remove user from all rooms
    rooms.forEach((roomUsers, roomName) => {
      if (roomUsers.has(socket.id)) {
        handleUserLeave(roomName, socket.id);
      }
    });
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  function handleUserLeave(roomName, userId) {
    try {
      if (rooms.has(roomName)) {
        const room = rooms.get(roomName);
        
        if (room.has(userId)) {
          room.delete(userId);
          console.log(`⬅️ User ${userId} removed from room ${roomName}`);
          
          // Notify other users
          socket.to(roomName).emit('user-disconnected', userId);
          
          // Clean up empty rooms
          if (room.size === 0) {
            rooms.delete(roomName);
            console.log(`🧹 Room ${roomName} deleted (empty)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling user leave:', error);
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
