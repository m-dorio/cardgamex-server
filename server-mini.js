const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("create-room", (roomId, playerData) => {
    console.log(`Creating room with ID: ${roomId} for player: ${socket.id}`);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        turn: null,
        playAgainVotes: 0,
        diceRolls: {},
        scores: {},
      };
      console.log(`Room ${roomId} created.`);
    }

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
    io.to(roomId).emit("update-scores", rooms[roomId].scores);
    console.log(`Player ${socket.id} joined room ${roomId}`);
  });

  socket.on("join-game", (roomId, playerData) => {
    console.log(`Player ${socket.id} attempting to join room: ${roomId}`);
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 2) return;

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
    io.to(roomId).emit("update-scores", rooms[roomId].scores);
    console.log(`Player ${socket.id} joined room ${roomId}`);
  });

  socket.on("player-ready", (roomId) => {
    console.log(`Player ${socket.id} is ready in room ${roomId}`);
    if (!rooms[roomId]) return;

    rooms[roomId].players[socket.id].ready = true;
    io.to(roomId).emit("player-ready-update", rooms[roomId].players);

    if (Object.values(rooms[roomId].players).every((p) => p.ready)) {
      console.log(`Both players are ready in room ${roomId}. Rolling dice...`);
      const playerIds = Object.keys(rooms[roomId].players);
      rooms[roomId].diceRolls[playerIds[0]] = Math.floor(Math.random() * 6) + 1;
      rooms[roomId].diceRolls[playerIds[1]] = Math.floor(Math.random() * 6) + 1;

      const firstTurn =
        rooms[roomId].diceRolls[playerIds[0]] >= rooms[roomId].diceRolls[playerIds[1]]
          ? playerIds[0]
          : playerIds[1];

      rooms[roomId].turn = null;
      io.to(roomId).emit("dice-roll-result", {
        turn: firstTurn,
        diceRolls: rooms[roomId].diceRolls,
      });

      setTimeout(() => {
        rooms[roomId].turn = firstTurn;
        io.to(roomId).emit("set-turn", firstTurn);
        console.log(`First turn is assigned to player ${firstTurn} in room ${roomId}`);
      }, 2000);

      Object.values(rooms[roomId].players).forEach(
        (player) => (player.ready = false)
      );
    }
  });

  socket.on("attack", ({ roomId, attackerId, damage }) => {
    console.log(`Player ${attackerId} is attacking in room ${roomId} with damage: ${damage}`);
    if (!rooms[roomId] || rooms[roomId].turn !== attackerId) return;

    const opponentId = Object.keys(rooms[roomId].players).find(
      (id) => id !== attackerId
    );
    if (!opponentId) return;

    io.to(opponentId).emit("receive-attack", { damage });
    io.to(attackerId).emit("enemy-damaged", { damage });

    rooms[roomId].turn = opponentId;
    io.to(roomId).emit("set-turn", opponentId);
    console.log(`Turn changed to player ${opponentId} after attack in room ${roomId}`);
  });

  socket.on("game-over", ({ roomId, winnerId, loserId }) => {
    console.log(`Game over in room ${roomId}. Winner: ${winnerId}, Loser: ${loserId}`);
    if (!rooms[roomId]) return;

    if (!rooms[roomId].scores[winnerId]) {
      rooms[roomId].scores[winnerId] = { wins: 0, losses: 0 };
    }
    if (!rooms[roomId].scores[loserId]) {
      rooms[roomId].scores[loserId] = { wins: 0, losses: 0 };
    }

    rooms[roomId].scores[winnerId].wins += 1;
    rooms[roomId].scores[loserId].losses += 1;

    io.to(roomId).emit("update-scores", rooms[roomId].scores);
    console.log(`Scores updated after game over in room ${roomId}`);
  });

  socket.on("request-play-again", (roomId) => {
    console.log(`Play again request received in room ${roomId}`);
    if (rooms[roomId]) {
      rooms[roomId].playAgainVotes += 1;
      io.to(roomId).emit("play-again-vote", rooms[roomId].playAgainVotes);

      if (rooms[roomId].playAgainVotes >= 2) {
        rooms[roomId].playAgainVotes = 0;

        const previousScores = { ...rooms[roomId].scores };

        rooms[roomId].turn = null;
        rooms[roomId].diceRolls = {};
        Object.values(rooms[roomId].players).forEach((player) => {
          player.ready = false;
        });

        rooms[roomId].scores = previousScores;

        io.to(roomId).emit("show-ready-button");
        io.to(roomId).emit("update-players", rooms[roomId].players);
        io.to(roomId).emit("update-scores", rooms[roomId].scores);
        console.log(`Game reset and scores restored for room ${roomId}`);
      }
    }
  });

  socket.on("leave-room", (roomId) => {
    console.log(`Player ${socket.id} leaving room ${roomId}`);
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      delete rooms[roomId].players[socket.id];
      delete rooms[roomId].scores[socket.id];

      io.to(roomId).emit("update-players", rooms[roomId].players);
      io.to(roomId).emit("update-scores", rooms[roomId].scores);
      io.to(roomId).emit("player-left");

      if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId];
    }
    socket.leave(roomId);
    console.log(`Player ${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Player ${socket.id} disconnected`);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        delete rooms[roomId].scores[socket.id];

        io.to(roomId).emit("update-players", rooms[roomId].players);
        io.to(roomId).emit("update-scores", rooms[roomId].scores);
        io.to(roomId).emit("player-left");

        if (Object.keys(rooms[roomId].players).length === 0)
          delete rooms[roomId];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
