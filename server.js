const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // React frontend URL
    methods: ["GET", "POST"],
  },
});

let rooms = {}; // Store game rooms

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-game", (roomId, playerData) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }
    rooms[roomId].players[socket.id] = playerData;

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
  });

  socket.on("attack", ({ roomId, attackerId, damage }) => {
    const opponentId = Object.keys(rooms[roomId].players).find(id => id !== attackerId);
    if (opponentId) {
      io.to(opponentId).emit("receive-attack", damage);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      delete rooms[roomId].players[socket.id];
      io.to(roomId).emit("update-players", rooms[roomId].players);
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
