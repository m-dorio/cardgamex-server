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
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        turn: null,
        playAgainVotes: 0,
        diceRolls: {},
        scores: {},
      };
    }

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
    io.to(roomId).emit("update-scores", rooms[roomId].scores);
  });

  socket.on("join-game", (roomId, playerData) => {
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 2)
      return;

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
    io.to(roomId).emit("update-scores", rooms[roomId].scores);
  });

  socket.on("player-ready", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].players[socket.id].ready = true;
    io.to(roomId).emit("player-ready-update", rooms[roomId].players);

    if (Object.values(rooms[roomId].players).every((p) => p.ready)) {
      const playerIds = Object.keys(rooms[roomId].players);
      rooms[roomId].diceRolls[playerIds[0]] = Math.floor(Math.random() * 6) + 1;
      rooms[roomId].diceRolls[playerIds[1]] = Math.floor(Math.random() * 6) + 1;

      const firstTurn =
        rooms[roomId].diceRolls[playerIds[0]] >=
        rooms[roomId].diceRolls[playerIds[1]]
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
      }, 2000);

      Object.values(rooms[roomId].players).forEach(
        (player) => (player.ready = false)
      );
    }
  });

  socket.on("attack", ({ roomId, attackerId, damage }) => {
    if (!rooms[roomId] || rooms[roomId].turn !== attackerId) return;

    const opponentId = Object.keys(rooms[roomId].players).find(
      (id) => id !== attackerId
    );
    if (!opponentId) return;

    io.to(opponentId).emit("receive-attack", { damage });
    io.to(attackerId).emit("enemy-damaged", { damage });

    rooms[roomId].turn = opponentId;
    io.to(roomId).emit("set-turn", opponentId);
  });

  socket.on("game-over", ({ roomId, winnerId, loserId }) => {
    if (!rooms[roomId]) return;

    // ✅ Ensure scores exist for both players
    if (!rooms[roomId].scores[winnerId]) {
      rooms[roomId].scores[winnerId] = { wins: 0, losses: 0 };
    }
    if (!rooms[roomId].scores[loserId]) {
      rooms[roomId].scores[loserId] = { wins: 0, losses: 0 };
    }

    // ✅ Now update wins/losses safely
    rooms[roomId].scores = {
      ...rooms[roomId].scores,
      [winnerId]: {
        ...rooms[roomId].scores[winnerId],
        wins: rooms[roomId].scores[winnerId].wins + 1,
      },
      [loserId]: {
        ...rooms[roomId].scores[loserId],
        losses: rooms[roomId].scores[loserId].losses + 1,
      },
    };

    io.to(roomId).emit("update-scores", rooms[roomId].scores);
});
;

  socket.on("request-play-again", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].playAgainVotes += 1;
      io.to(roomId).emit("play-again-vote", rooms[roomId].playAgainVotes);

      if (rooms[roomId].playAgainVotes >= 2) {
        rooms[roomId].playAgainVotes = 0;

        // ✅ Preserve scores when resetting the game
        const previousScores = { ...rooms[roomId].scores };

        rooms[roomId].turn = null;
        rooms[roomId].diceRolls = {};
        Object.values(rooms[roomId].players).forEach((player) => {
          player.ready = false;
        });

        rooms[roomId].scores = previousScores; // ✅ Restore previous scores

        io.to(roomId).emit("show-ready-button");
        io.to(roomId).emit("update-players", rooms[roomId].players);
        io.to(roomId).emit("update-scores", rooms[roomId].scores);
      }
    }
  });

  socket.on("leave-room", (roomId) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      delete rooms[roomId].players[socket.id];
      delete rooms[roomId].scores[socket.id];

      io.to(roomId).emit("update-players", rooms[roomId].players);
      io.to(roomId).emit("update-scores", rooms[roomId].scores);
      io.to(roomId).emit("player-left");

      if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId];
    }
    socket.leave(roomId);
  });

  socket.on("disconnect", () => {
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
