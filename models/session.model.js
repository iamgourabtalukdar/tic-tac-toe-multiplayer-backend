import { model, Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  }
);

sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Session = model("Session", sessionSchema);

export default Session;
