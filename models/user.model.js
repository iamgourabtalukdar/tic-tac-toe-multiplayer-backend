import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      minLength: [3, "Name Should contain 3 characters"],
      maxLength: [30, "Name Should not exceed 30 characters"],
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "please enter a valid email"],
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "password must be at least 6 characters long"],
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  }
);

const User = model("User", userSchema);
export default User;
