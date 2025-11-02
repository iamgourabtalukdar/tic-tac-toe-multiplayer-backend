import Room from "../models/room.model.js";

export const createRoom = async (req, res, next) => {
  const MAX_RETRIES = 10;

  try {
    for (let i = 0; i < MAX_RETRIES; i++) {
      // Generate a 6-character random code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      try {
        const room = await Room.create({
          code,
          createdBy: req.user._id,
        });

        // If creation is successful, send the response and exit
        return res.status(201).json({
          status: true,
          data: { code: room.code },
        });
      } catch (error) {
        // Check if the error is a MongoDB duplicate key error
        if (error.code === 11000) {
          console.warn(`Room code collision: ${code}. Retrying...`);
        } else {
          // If it's a different error, throw it to be caught by the outer catch
          throw error;
        }
      }
    }

    // If the loop finishes, all retries failed
    throw new Error(
      "Failed to create a unique room code after multiple attempts."
    );
  } catch (error) {
    next(error);
  }
};

export const roomStatus = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ code: roomId }).select("status").lean();
    if (!room) {
      return res.status(404).json({
        status: false,
        errors: { message: "Room not found" },
      });
    }
    if (room.status === "playing") {
      return res.status(400).json({
        status: false,
        errors: { message: "Cannot join, game already started" },
      });
    }
    if (room.status === "finished") {
      return res.status(400).json({
        status: false,
        errors: { message: "Cannot join, game already finished" },
      });
    }
    res.status(200).json({
      status: true,
      data: { status: "waiting" },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
