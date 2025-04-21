import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import mongoose, { Schema, Document } from "npm:mongoose@^6.7";

export interface IVenue extends Document {
  _id: Bson.ObjectID;
  name: string;
  location: string;
  images: string[];
  manager: Bson.ObjectID;
}

export const venueSchema = new mongoose.Schema<IVenue>({
  name: { type: String, required: true },
  location: { type: String, required: true },
  images: { type: [String], required: true },
  manager: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export const Venue = mongoose.model<IVenue>("Venue", venueSchema);
