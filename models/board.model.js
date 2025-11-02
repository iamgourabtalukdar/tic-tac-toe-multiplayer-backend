import { Schema, model } from "mongoose";

const boardSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true, // Ensures one board per room
    },
    cells: {
      type: [String], // Array of 9 strings
      enum: ["X", "O", null], // Each cell can be X, O, or null
      default: Array(9).fill(null), // Initializes as [null, null, ..., null]
      validate: [(val) => val.length === 9, "Board must have exactly 9 cells"],
    },
    moveHistory: [
      {
        sign: { type: String, enum: ["X", "O"] },
        index: { type: Number, min: 0, max: 8 },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

const Board = model("Board", boardSchema);
export default Board;
