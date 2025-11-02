import { checkSocketAuth } from "../middlewares/auth.middleware.js";
import Session from "../models/session.model.js";
import Room from "../models/room.model.js";
import Board from "../models/board.model.js";
import {
  handleJoinRoom,
  handleLeaveRoom,
  handleStartGame,
  handleMakeMove,
} from "./room.socket.js";

const initializeSocket = (io) => {
  try {
    io.use(checkSocketAuth);

    io.on("connection", async (socket) => {
      try {
        await Session.findByIdAndUpdate(
          socket.sessionId,
          { socketId: socket.id },
          { new: true }
        );
        console.log(
          `User connected: ${socket.user.username} (ID: ${socket.id})`
        );

        // --- REGISTER ALL EVENT HANDLERS ---
        socket.on("joinRoom", ({ roomId }) => {
          handleJoinRoom({ io, socket, roomId });
        });

        socket.on("leaveRoom", ({ roomId }) => {
          handleLeaveRoom({ io, socket, roomId });
        });

        socket.on("startGame", ({ roomId }) => {
          handleStartGame({ io, socket, roomId });
        });

        socket.on("makeMove", (data) => {
          handleMakeMove({ io, socket, data });
        });

        // --- "IMPLICIT LEAVE" HANDLER ---
        socket.on("disconnect", async () => {
          console.log(`User disconnected: ${socket.user.username}`);

          try {
            // 1. Mark user as offline
            await Session.findByIdAndUpdate(
              socket.sessionId,
              { socketId: null },
              { new: true }
            );

            // 2. Find any *active* room the user was in
            const room = await Room.findOne({
              "players.user": socket.user._id,
              // THIS IS THE CRITICAL CHECK:
              // Only clean up rooms that are not finished.
              status: { $in: ["waiting", "playing"] },
            });

            if (room) {
              // --- Run Cleanup Logic ---
              const leavingPlayer = room.players.find((p) =>
                p.user.equals(socket.user._id)
              );
              room.players = room.players.filter(
                (p) => !p.user.equals(socket.user._id)
              );
              room.status = "waiting";
              room.currentTurn = null;
              room.winner = null;

              if (room.board) {
                await Board.findByIdAndDelete(room.board);
                room.board = null;
              }
              await room.save();

              // 3. Notify the other player
              io.to(room.code).emit("opponentLeft", {
                id: socket.user._id,
                name: socket.user.name,
                username: socket.user.username,
                sign: leavingPlayer?.sign,
              });
            }
          } catch (disconnectError) {
            console.error(
              "Error during socket disconnect cleanup:",
              disconnectError
            );
          }
        });
      } catch (err) {
        console.error("Socket connection error:", err.message);
        socket.disconnect();

        if (socket.sessionId) {
          await Session.findByIdAndUpdate(
            socket.sessionId,
            { socketId: null },
            { new: true }
          );
        }
      }
    });
  } catch (err) {
    console.error("Socket initialization error:", err.message);
  }
};

export { initializeSocket };
