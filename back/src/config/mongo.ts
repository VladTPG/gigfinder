import mongoose from "npm:mongoose@^6.7";
import { load } from "https://deno.land/std/dotenv/mod.ts";

await load({ export: true });

const ADMIN_USER = Deno.env.get("MONGO_ATLAS_USER");
const ADMIN_PASS = Deno.env.get("MONGO_ATLAS_PASSWORD");

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error("MongoDB credentials not found in environment variables");
  Deno.exit(1);
}

const MONGO_ATLAS_CONNECTION_STRING = `mongodb+srv://${ADMIN_USER}:${ADMIN_PASS}@gigfinder.eitmste.mongodb.net/?retryWrites=true&w=majority&appName=gigfinder`;

export async function run() {
  try {
    await mongoose.connect(MONGO_ATLAS_CONNECTION_STRING, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB Atlas");
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
