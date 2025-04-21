import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import mongoose, { Schema, Document } from "npm:mongoose@^6.7";
import { Genres } from "../interfaces/genres.enum.ts";

export interface IBand extends Document {
  _id: Bson.ObjectID;
  name: string;
  members: Bson.ObjectID[];
  genres: Genres[];
  bio?: string;
  profilePicture?: string;
  videos: Bson.ObjectID[];
}

const bandSchema = new mongoose.Schema<IBand>(
  {
    name: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    genres: {
      type: [String],
      enum: Object.values(Genres),
      required: true,
    },
    bio: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    videos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
  },
  { timestamps: true }
);

export const Band = mongoose.model<IBand>("Band", bandSchema);
