import mongoose from "mongoose";

export async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connected");
  } catch (err) {
    console.log("Unable to connect DB");
    console.log(err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("DB disconnected");
  process.exit(0);
});
