import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface Auction {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  startingPrice: number;
  currentPrice: number;
  highestBidderId?: string;
  sellerId: string;
  sellerName: string;
  endTime: Timestamp;
  createdAt: Timestamp;
  status: 'active' | 'ended';
  paymentStatus?: 'pending' | 'paid' | 'shipped' | 'completed';
  bidCount: number;
  extensionsUsed: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: Timestamp;
}
