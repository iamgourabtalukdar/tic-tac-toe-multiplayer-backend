import Board from "../models/board.model.js";
import Room from "../models/room.model.js";

export const handleJoinRoom = async ({ socket, roomId }) => {
  try {
    if (!roomId) {
      socket.emit("roomError", { message: "Room ID is required" });
      return;
    }

    const room = await Room.findOne({ code: `${roomId}` }).populate({
      path: "players.user",
      select: "name username _id",
    });

    if (!room) {
      socket.emit("roomError", { message: "Room not found" });
      return;
    }

    // --- Check if the user already joined ---
    const alreadyJoined = room.players.find((p) =>
      p.user.equals(socket.user._id)
    );

    if (alreadyJoined) {
      const me = {
        id: alreadyJoined.user._id,
        name: alreadyJoined.user.name,
        username: alreadyJoined.user.username,
        sign: alreadyJoined.sign,
      };

      // Find the opponent (the *other* player in the room)
      const opponentData = room.players.find(
        (p) => !p.user.equals(socket.user._id)
      );

      let opponent = null;
      if (opponentData) {
        opponent = {
          id: opponentData.user._id,
          name: opponentData.user.name,
          username: opponentData.user.username,
          sign: opponentData.sign,
        };
      }

      const isAdmin = room.createdBy.equals(socket.user._id);

      socket.join(roomId);

      socket.emit("joinSuccess", {
        me,
        opponent,
        isAdmin,
      });

      if (room.status === "playing") {
        const board = await Board.findOne({ roomId: room._id });
        socket.emit("gameStarted", { room, board });
      }

      return;
    }

    // --- New Player Logic ---

    if (room.status !== "waiting") {
      socket.emit("roomError", {
        message: `Cannot join, room status is ${room.status}`,
      });
      return;
    }

    if (room.players.length >= room.maxPlayersCount) {
      socket.emit("roomError", { message: "Room is full" });
      return;
    }

    const me = {
      id: socket.user._id,
      name: socket.user.name,
      username: socket.user.username,
      sign: null,
    };
    let opponent = null;

    if (room.players.length === 0) {
      me.sign = "X";
    } else {
      me.sign = room.players[0].sign === "X" ? "O" : "X";

      const { _id: id, name, username } = room.players[0].user;
      opponent = {
        id,
        name,
        username,
        sign: room.players[0].sign,
      };
    }

    room.players.push({
      user: socket.user._id,
      sign: me.sign,
    });
    await room.save({ validateBeforeSave: true });

    const isAdmin = room.createdBy.equals(socket.user._id);

    socket.join(roomId);

    socket.emit("joinSuccess", { me, opponent, isAdmin });
    socket.to(roomId).emit("opponentJoined", { opponent: me });
  } catch (error) {
    socket.emit("roomError", { message: "Failed to join room" });
    console.error(`Error in handleJoinRoom: ${error}`);
  }
};

export const handleLeaveRoom = async ({ io, socket, roomId }) => {
  try {
    const room = await Room.findOne({
      code: `${roomId}`,
      status: { $in: ["waiting", "playing"] },
      "players.user": socket.user._id,
    });

    if (!room) {
      socket.emit("roomError", { message: "No active room found" });
      return;
    }

    const leavingPlayer = room.players.find((p) =>
      p.user.equals(socket.user._id)
    );

    room.players = room.players.filter((p) => !p.user.equals(socket.user._id));

    // Reset room state
    room.status = "waiting";
    room.currentTurn = null;
    room.winner = null;

    // Delete the associated board
    if (room.board) {
      await Board.findByIdAndDelete(room.board);
      room.board = null;
    }
    await room.save({ validateBeforeSave: true });

    if (room.code) {
      socket.leave(room.code);
    }
    // Also leave the room they *thought* they were in, just in case
    if (roomId) {
      socket.leave(roomId);
    }

    socket.emit("leaveSuccess", { message: "Left room successfully" });
    //  NOTIFY THE OTHER PLAYER
    io.to(room.code).emit("opponentLeft", {
      id: socket.user._id,
      name: socket.user.name,
      username: socket.user.username,
      sign: leavingPlayer?.sign,
    });
  } catch (error) {
    socket.emit("leaveError", { message: "Failed to leave room" });
    console.error(`Error in handleLeaveRoom: ${error}`);
  }
};

export const handleStartGame = async ({ io, socket, roomId }) => {
  try {
    const room = await Room.findOne({ code: `${roomId}` }).populate(
      "players.user"
    );
    if (!room) {
      socket.emit("roomError", { message: "Room not found" });
      return;
    }

    if (!room.createdBy.equals(socket.user._id)) {
      socket.emit("roomError", {
        message: "Only the room creator can start the game",
      });
      return;
    }

    if (room.players.length !== 2) {
      socket.emit("roomError", {
        message: "You need 2 players to start the game",
      });
      return;
    }

    if (room.status !== "waiting") {
      socket.emit("roomError", { message: "Game already started or finished" });
      return;
    }

    const board = new Board({ roomId: room._id, cells: Array(9).fill(null) });
    await board.save({ validateBeforeSave: true });

    const firstPlayer = room.players.find((p) => p.sign === "X");

    room.status = "playing";
    room.board = board._id;
    room.currentTurn = firstPlayer.user._id;

    await room.save({ validateBeforeSave: true });

    io.to(roomId).emit("gameStarted", { room, board });
  } catch (error) {
    socket.emit("roomError", { message: "Failed to start game" });
    console.error(`Error in handleStartGame: ${error}`);
  }
};

const calculateWinner = (cells) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: lines[i] };
    }
  }
  // Check for draw
  if (cells.every((cell) => cell !== null)) {
    return { winner: null, draw: true };
  }
  return null;
};

export const handleMakeMove = async ({ io, socket, data }) => {
  const { roomId, index } = data;

  try {
    const room = await Room.findOne({ code: roomId }).populate("players.user");
    const board = await Board.findOne({ roomId: room._id });

    // --- 1. Validation Checks ---
    if (!room || !board) {
      return socket.emit("roomError", { message: "Game not found." });
    }
    if (room.status !== "playing") {
      return socket.emit("roomError", { message: "Game is not active." });
    }
    if (room.currentTurn.toString() !== socket.user._id.toString()) {
      return socket.emit("roomError", { message: "Not your turn." });
    }
    if (board.cells[index] !== null) {
      return socket.emit("roomError", { message: "Square already taken." });
    }

    // --- 2. Update Game State ---
    const currentPlayer = room.players.find((p) =>
      p.user._id.equals(socket.user._id)
    );

    board.cells.set(index, currentPlayer.sign); // Use .set for Mongoose arrays
    board.moveHistory.push({ sign: currentPlayer.sign, index });

    // --- 3. Check for Win/Draw ---
    const gameResult = calculateWinner(board.cells);

    if (gameResult) {
      if (gameResult.winner) {
        // We have a winner
        room.status = "finished";
        room.winner = socket.user._id;
        room.currentTurn = null;
      } else if (gameResult.draw) {
        // It's a draw
        room.status = "finished";
        room.winner = null;
        room.currentTurn = null;
      }
    } else {
      // --- 4. No Winner, Switch Turn ---
      const opponent = room.players.find(
        (p) => !p.user._id.equals(socket.user._id)
      );
      room.currentTurn = opponent.user._id;
    }

    // --- 5. Save and Broadcast ---
    await board.save();
    await room.save();

    // Send the full updated state to EVERYONE in the room
    io.to(roomId).emit("gameUpdate", { room, board });
  } catch (error) {
    console.error(`Error in handleMakeMove: ${error}`);
    socket.emit("roomError", { message: "Failed to make move." });
  }
};
