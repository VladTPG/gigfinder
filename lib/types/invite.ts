import { serverTimestamp } from "firebase/firestore";

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

export interface IBandInvite {
  id: string; // Firestore document ID
  band: string; // Band ID
  user: string; // User ID
  status: InviteStatus;
  createdAt: typeof serverTimestamp;
  updatedAt: typeof serverTimestamp;
}
