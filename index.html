const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
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

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Store room data
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (room, displayName) => {
    socket.join(room);
    
    // Initialize room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = { users: [] };
    }
    
    // Add user to room with display name
    const userInfo = { id: socket.id, displayName };
    if (!rooms[room].users.find(u => u.id === socket.id)) {
      rooms[room].users.push(userInfo);
    }
    
    // Notify the joining user about existing users
    socket.emit('room-joined', rooms[room].users);
    
    // Notify others about the new user
    socket.to(room).emit('user-connected', socket.id, displayName);
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      handleUserLeave(room, socket.id);
    });
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    handleUserLeave(room, socket.id);
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

  socket.on('chat-message', ({ room, message, userId, userName }) => {
    socket.to(room).emit('chat-message', { 
      message, 
      userId,
      userName
    });
  });

  socket.on('user-media-update', ({ room, userId, video, audio }) => {
    socket.to(room).emit('user-media-update', { userId, video, audio });
  });

  socket.on('update-display-name', ({ room, userId, displayName }) => {
    // Update display name in room data
    if (rooms[room]) {
      const user = rooms[room].users.find(u => u.id === userId);
      if (user) {
        user.displayName = displayName;
      }
    }
    socket.to(room).emit('update-display-name', { userId, displayName });
  });

  function handleUserLeave(room, userId) {
    if (rooms[room]) {
      rooms[room].users = rooms[room].users.filter(u => u.id !== userId);
      
      // Delete room if empty
      if (rooms[room].users.length === 0) {
        delete rooms[room];
      }
    }
    
    socket.to(room).emit('user-disconnected', userId);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Signaling server running on port', PORT);
});
