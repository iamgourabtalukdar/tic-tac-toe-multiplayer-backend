import { Schema, model } from "mongoose";

const roomSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    maxPlayersCount: {
      type: Number,
      default: 2,
    },
    players: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        sign: { type: String, enum: ["X", "O"], default: null },
        _id: false,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "playing", "finished", "abandoned"],
      default: "waiting",
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      default: null,
    },
    currentTurn: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: "__v" }
);

const Room = model("Room", roomSchema);

export default Room;
