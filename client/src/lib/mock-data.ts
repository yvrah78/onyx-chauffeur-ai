import { addDays, subDays, setHours, setMinutes } from "date-fns";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  ragProfile: {
    summary: string;
    preferences: string[];
    notes: string[];
    lastInteraction: string;
  };
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: "available" | "busy" | "offline";
  avatar: string;
}

export interface Trip {
  id: string;
  clientId: string;
  driverId?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: Date;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  price: number;
  paymentStatus: "paid" | "pending" | "unpaid";
}

export interface Message {
  id: string;
  senderId: string; // 'bot' | clientId | driverId
  receiverId: string;
  content: string;
  timestamp: Date;
  type: "sms" | "whatsapp" | "internal";
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Eleanor Sterling",
    phone: "+1 (555) 010-1234",
    email: "eleanor.s@example.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
    ragProfile: {
      summary: "High-value corporate client. Prefers quiet rides. Usually travels to Teterboro Airport on Thursdays.",
      preferences: ["Temperature: 68°F", "Water: Sparkling", "Music: Jazz or Silence", "Vehicle: SUV Black"],
      notes: ["Allergic to strong perfumes", "Requires 15 min buffer for airport runs"],
      lastInteraction: "Yesterday via SMS",
    },
  },
  {
    id: "c2",
    name: "Marcus Thorne",
    phone: "+1 (555) 012-5678",
    email: "m.thorne@venture.cap",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces",
    ragProfile: {
      summary: "Venture Capitalist. Often books last minute. Values speed and efficiency.",
      preferences: ["Temperature: 70°F", "Water: Flat", "Route: Fastest (Waze)", "Conversation: Minimal"],
      notes: ["Often has luggage assistance needed", "Assistant 'Sarah' handles billing"],
      lastInteraction: "2 hours ago via SMS",
    },
  },
];

export const MOCK_DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "James Anderson",
    phone: "+1 (555) 987-6543",
    status: "available",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
  },
  {
    id: "d2",
    name: "Sofia Rodriguez",
    phone: "+1 (555) 876-5432",
    status: "busy",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=faces",
  },
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: "t1",
    clientId: "c1",
    driverId: "d1",
    pickupLocation: "15 Central Park West, NY",
    dropoffLocation: "Teterboro Airport (TEB)",
    pickupTime: setHours(setMinutes(addDays(new Date(), 1), 0), 14), // Tomorrow 2 PM
    status: "scheduled",
    price: 250,
    paymentStatus: "pending",
  },
  {
    id: "t2",
    clientId: "c2",
    driverId: "d2",
    pickupLocation: "JFK Terminal 4",
    dropoffLocation: "The Greenwich Hotel",
    pickupTime: setHours(setMinutes(new Date(), 30), 18), // Today 6:30 PM
    status: "in-progress",
    price: 180,
    paymentStatus: "paid",
  },
  {
    id: "t3",
    clientId: "c1",
    driverId: "d1",
    pickupLocation: "Soho House NY",
    dropoffLocation: "15 Central Park West, NY",
    pickupTime: setHours(setMinutes(subDays(new Date(), 2), 0), 23), // 2 days ago 11 PM
    status: "completed",
    price: 120,
    paymentStatus: "paid",
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    senderId: "c1",
    receiverId: "bot",
    content: "I need a car for tomorrow at 2 PM to TEB. Same details as usual.",
    timestamp: subDays(new Date(), 1),
    type: "sms",
  },
  {
    id: "m2",
    senderId: "bot",
    receiverId: "c1",
    content: "Certainly, Ms. Sterling. 15 CPW to Teterboro for tomorrow at 2:00 PM. SUV requested. I've scheduled James for you. Confirmation sent to your calendar.",
    timestamp: subDays(new Date(), 1),
    type: "sms",
  },
  {
    id: "m3",
    senderId: "c1",
    receiverId: "bot",
    content: "Perfect, thank you.",
    timestamp: subDays(new Date(), 1),
    type: "sms",
  },
  {
    id: "m4",
    senderId: "bot",
    receiverId: "d1",
    content: "New Trip Assignment: Pickup Ms. Sterling at 15 CPW tomorrow @ 14:00. Dropoff: TEB. Notes: Quiet ride, Sparkling water.",
    timestamp: subDays(new Date(), 1),
    type: "sms",
  },
];
