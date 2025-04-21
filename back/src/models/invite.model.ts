import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import mongoose, { Schema, Document } from "npm:mongoose@^6.7";

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

export interface IBandInvite extends Document {
  _id: Bson.ObjectID;
  band: Bson.ObjectID;
  user: Bson.ObjectID;
  status: InviteStatus;
}

const bandInviteSchema = new mongoose.Schema<IBandInvite>(
  {
    band: { type: Schema.Types.ObjectId, ref: "Band", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(InviteStatus),
      required: true,
      default: InviteStatus.PENDING,
    },
  },
  { timestamps: true }
);
bandInviteSchema.index({ band: 1, user: 1 }, { unique: true });

export const BandInvite = mongoose.model<IBandInvite>(
  "BandInvite",
  bandInviteSchema
);
