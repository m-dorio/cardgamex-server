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
<<<<<<< HEAD
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };
=======
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || { wins: 0, losses: 0 };
>>>>>>> 82841b6176507eff39853212552f498aff757959

    socket.join(roomId);
    io.to(roomId).emit("update-players", rooms[roomId].players);
    io.to(roomId).emit("update-scores", rooms[roomId].scores);
  });

  socket.on("join-game", (roomId, playerData) => {
<<<<<<< HEAD
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 2)
      return;

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || {
      wins: 0,
      losses: 0,
    };
=======
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 2) return;

    rooms[roomId].players[socket.id] = { ...playerData, ready: false };
    rooms[roomId].scores[socket.id] = rooms[roomId].scores[socket.id] || { wins: 0, losses: 0 };
>>>>>>> 82841b6176507eff39853212552f498aff757959

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
<<<<<<< HEAD
        rooms[roomId].diceRolls[playerIds[0]] >=
        rooms[roomId].diceRolls[playerIds[1]]
=======
        rooms[roomId].diceRolls[playerIds[0]] >= rooms[roomId].diceRolls[playerIds[1]]
>>>>>>> 82841b6176507eff39853212552f498aff757959
          ? playerIds[0]
          : playerIds[1];

      rooms[roomId].turn = null;
<<<<<<< HEAD
      io.to(roomId).emit("dice-roll-result", {
        turn: firstTurn,
        diceRolls: rooms[roomId].diceRolls,
      });
=======
      io.to(roomId).emit("dice-roll-result", { turn: firstTurn, diceRolls: rooms[roomId].diceRolls });
>>>>>>> 82841b6176507eff39853212552f498aff757959

      setTimeout(() => {
        rooms[roomId].turn = firstTurn;
        io.to(roomId).emit("set-turn", firstTurn);
      }, 2000);

<<<<<<< HEAD
      Object.values(rooms[roomId].players).forEach(
        (player) => (player.ready = false)
      );
=======
      Object.values(rooms[roomId].players).forEach((player) => (player.ready = false));
>>>>>>> 82841b6176507eff39853212552f498aff757959
    }
  });

  socket.on("attack", ({ roomId, attackerId, damage }) => {
    if (!rooms[roomId] || rooms[roomId].turn !== attackerId) return;

<<<<<<< HEAD
    const opponentId = Object.keys(rooms[roomId].players).find(
      (id) => id !== attackerId
    );
=======
    const opponentId = Object.keys(rooms[roomId].players).find((id) => id !== attackerId);
>>>>>>> 82841b6176507eff39853212552f498aff757959
    if (!opponentId) return;

    io.to(opponentId).emit("receive-attack", { damage });
    io.to(attackerId).emit("enemy-damaged", { damage });

    rooms[roomId].turn = opponentId;
    io.to(roomId).emit("set-turn", opponentId);
  });

<<<<<<< HEAD
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
=======
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
  rooms[roomId].scores[winnerId].wins += 1;
  rooms[roomId].scores[loserId].losses += 1;

  io.to(roomId).emit("update-scores", rooms[roomId].scores);
});


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
>>>>>>> 82841b6176507eff39853212552f498aff757959
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

<<<<<<< HEAD
        if (Object.keys(rooms[roomId].players).length === 0)
          delete rooms[roomId];
=======
        if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId];
>>>>>>> 82841b6176507eff39853212552f498aff757959
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
