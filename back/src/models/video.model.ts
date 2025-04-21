import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import mongoose, { Schema, Document } from "npm:mongoose@^6.7";

export interface IVideo extends Document {
  _id: Bson.ObjectID;
  title: string;
  artist: string;
  videoUrl: string;
  thumbnailUrl: string;
}

const videoSchema = new mongoose.Schema<IVideo>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export const Video = mongoose.model<IVideo>("Video", videoSchema);
