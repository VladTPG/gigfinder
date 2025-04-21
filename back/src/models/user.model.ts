import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import mongoose, { Schema, Document } from "npm:mongoose@^6.7";
import bcrypt from "npm:bcryptjs";

export enum UserRole {
  MUSICIAN = "musician",
  MANAGER = "manager",
  ADMIN = "admin",
}

export interface IProfile {
  username: string;
  bio?: string;
  instruments: string[];
  genres: string[];
  profilePicture?: string;
  location: string;
}

export interface IUser extends Document {
  _id: Bson.ObjectID;
  email: string;
  password: string;
  role: UserRole;
  profile: IProfile;
  followers: Bson.ObjectID[] | null;
  following: Bson.ObjectID[] | null;
  videos: Bson.ObjectID[] | null;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      match: [
        /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
        "Password must be at least 8 characters long and contain at least one letter and one number",
      ],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MUSICIAN,
    },
    profile: {
      username: { type: String, required: true },
      bio: { type: String, default: "", required: false },
      instruments: { type: [String], default: [] },
      genres: { type: [String], default: [] },
      profilePicture: { type: String, default: "" },
      location: { type: String, default: "" },
    },
    followers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    following: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    videos: { type: [Schema.Types.ObjectId], ref: "Video", default: [] },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
