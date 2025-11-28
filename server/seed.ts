import { db } from "./db";
import { clients, drivers, trips, ragProfiles, messages } from "@shared/schema";
import { addDays, subDays, setHours, setMinutes, addHours } from "date-fns";

async function seed() {
  console.log("Seeding database with extended test data...");

  try {
    const allClients = await db.insert(clients).values([
      {
        name: "Eleanor Sterling",
        phone: "+1 (555) 010-1234",
        email: "eleanor.s@example.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Marcus Thorne",
        phone: "+1 (555) 012-5678",
        email: "m.thorne@venture.cap",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Victoria Chen",
        phone: "+1 (555) 234-5678",
        email: "victoria.chen@goldmansachs.com",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Richard Blackwood",
        phone: "+1 (555) 345-6789",
        email: "rblackwood@blackwoodholdings.com",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Sophia Russo",
        phone: "+1 (555) 456-7890",
        email: "sophia@russolaw.com",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Alexander Petrov",
        phone: "+1 (555) 567-8901",
        email: "a.petrov@petrovenergy.com",
        avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Isabella Montague",
        phone: "+1 (555) 678-9012",
        email: "isabella.m@sothebys.com",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Jonathan Wells",
        phone: "+1 (555) 789-0123",
        email: "jwells@wellscapital.com",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=64&h=64&fit=crop&crop=faces",
      },
    ]).returning();

    console.log(`✓ Created ${allClients.length} clients`);

    await db.insert(ragProfiles).values([
      {
        clientId: allClients[0].id,
        summary: "High-value corporate client. Prefers quiet rides. Usually travels to Teterboro Airport on Thursdays.",
        preferences: JSON.stringify(["Temperature: 68°F", "Water: Sparkling", "Music: Jazz or Silence", "Vehicle: SUV Black"]),
        notes: JSON.stringify(["Allergic to strong perfumes", "Requires 15 min buffer for airport runs"]),
        lastInteraction: subDays(new Date(), 1),
      },
      {
        clientId: allClients[1].id,
        summary: "Venture Capitalist. Often books last minute. Values speed and efficiency.",
        preferences: JSON.stringify(["Temperature: 70°F", "Water: Flat", "Route: Fastest (Waze)", "Conversation: Minimal"]),
        notes: JSON.stringify(["Often has luggage assistance needed", "Assistant 'Sarah' handles billing"]),
        lastInteraction: new Date(),
      },
      {
        clientId: allClients[2].id,
        summary: "Goldman Sachs executive. Weekly trips to JFK for international flights. Very punctual.",
        preferences: JSON.stringify(["Temperature: 72°F", "Water: Evian only", "Music: Classical", "Vehicle: Sedan Black"]),
        notes: JSON.stringify(["Always flies business class", "Prefers driver James", "Never late"]),
        lastInteraction: subDays(new Date(), 3),
      },
      {
        clientId: allClients[3].id,
        summary: "Real estate developer. Frequent site visits. Needs spacious vehicle for documents.",
        preferences: JSON.stringify(["Temperature: 65°F", "Newspapers: WSJ & NYT", "Phone charger: Always"]),
        notes: JSON.stringify(["Often has 2-3 business associates", "Tips generously", "Prefers early morning pickups"]),
        lastInteraction: subDays(new Date(), 2),
      },
      {
        clientId: allClients[4].id,
        summary: "Senior partner at law firm. Court appearances require punctuality. Often works during rides.",
        preferences: JSON.stringify(["Temperature: 70°F", "Silence preferred", "Privacy partition: Up", "WiFi: Required"]),
        notes: JSON.stringify(["Confidential calls during rides", "Leather briefcase - handle with care"]),
        lastInteraction: new Date(),
      },
      {
        clientId: allClients[5].id,
        summary: "Energy sector CEO. International travel. Speaks Russian. VIP treatment always.",
        preferences: JSON.stringify(["Temperature: 68°F", "Water: San Pellegrino", "Vehicle: SUV only", "Route: Scenic when time permits"]),
        notes: JSON.stringify(["Security detail sometimes", "Wife Elena often travels with him", "Prefers early departures"]),
        lastInteraction: subDays(new Date(), 5),
      },
      {
        clientId: allClients[6].id,
        summary: "Art dealer. Frequent trips to galleries and auction houses. Refined taste.",
        preferences: JSON.stringify(["Temperature: 70°F", "Music: Opera", "Vehicle: Luxury sedan", "White gloves service"]),
        notes: JSON.stringify(["Sometimes transports artwork", "Knows all drivers by name", "Prefers Sofia"]),
        lastInteraction: subDays(new Date(), 1),
      },
      {
        clientId: allClients[7].id,
        summary: "Hedge fund manager. Time is money. Multiple daily appointments. High stress tolerance needed.",
        preferences: JSON.stringify(["Temperature: 66°F", "Multiple phone chargers", "Quiet", "Fast routes only"]),
        notes: JSON.stringify(["Back-to-back meetings", "Often changes destinations mid-ride", "Always in a hurry"]),
        lastInteraction: new Date(),
      },
    ]);

    console.log("✓ Created RAG profiles");

    const allDrivers = await db.insert(drivers).values([
      {
        name: "James Anderson",
        phone: "+1 (555) 987-6543",
        status: "available",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Sofia Rodriguez",
        phone: "+1 (555) 876-5432",
        status: "busy",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Michael Chen",
        phone: "+1 (555) 765-4321",
        status: "available",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "David Williams",
        phone: "+1 (555) 654-3210",
        status: "available",
        avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Carlos Martinez",
        phone: "+1 (555) 543-2109",
        status: "offline",
        avatar: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=64&h=64&fit=crop&crop=faces",
      },
      {
        name: "Robert Taylor",
        phone: "+1 (555) 432-1098",
        status: "available",
        avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=64&h=64&fit=crop&crop=faces",
      },
    ]).returning();

    console.log(`✓ Created ${allDrivers.length} drivers`);

    const now = new Date();
    
    await db.insert(trips).values([
      {
        clientId: allClients[0].id,
        driverId: allDrivers[0].id,
        pickupLocation: "15 Central Park West, NY",
        dropoffLocation: "Teterboro Airport (TEB)",
        pickupTime: setHours(setMinutes(addDays(now, 1), 0), 14),
        status: "scheduled",
        price: 250,
        paymentStatus: "pending",
      },
      {
        clientId: allClients[1].id,
        driverId: allDrivers[1].id,
        pickupLocation: "JFK Terminal 4",
        dropoffLocation: "The Greenwich Hotel",
        pickupTime: setHours(setMinutes(now, 30), 18),
        status: "in-progress",
        price: 180,
        paymentStatus: "paid",
      },
      {
        clientId: allClients[0].id,
        driverId: allDrivers[0].id,
        pickupLocation: "Soho House NY",
        dropoffLocation: "15 Central Park West, NY",
        pickupTime: setHours(setMinutes(subDays(now, 2), 0), 23),
        status: "completed",
        price: 120,
        paymentStatus: "paid",
      },
      {
        clientId: allClients[2].id,
        driverId: null,
        pickupLocation: "200 West St, Goldman Sachs HQ",
        dropoffLocation: "JFK Terminal 1 (International)",
        pickupTime: addHours(now, 3),
        status: "scheduled",
        price: 195,
        paymentStatus: "unpaid",
        notes: "International flight - needs extra time",
      },
      {
        clientId: allClients[3].id,
        driverId: null,
        pickupLocation: "432 Park Avenue",
        dropoffLocation: "Hudson Yards Development Site",
        pickupTime: addHours(now, 5),
        status: "scheduled",
        price: 85,
        paymentStatus: "unpaid",
        notes: "Site visit with 2 associates",
      },
      {
        clientId: allClients[4].id,
        driverId: null,
        pickupLocation: "Russo & Partners LLP, 1 Liberty Plaza",
        dropoffLocation: "NY State Supreme Court, 60 Centre St",
        pickupTime: setHours(setMinutes(addDays(now, 1), 30), 8),
        status: "scheduled",
        price: 65,
        paymentStatus: "unpaid",
        notes: "Court appearance - MUST be on time",
      },
      {
        clientId: allClients[5].id,
        driverId: null,
        pickupLocation: "The Pierre Hotel",
        dropoffLocation: "Newark Liberty Airport (EWR)",
        pickupTime: setHours(setMinutes(addDays(now, 1), 0), 6),
        status: "scheduled",
        price: 220,
        paymentStatus: "pending",
        notes: "VIP - International departure",
      },
      {
        clientId: allClients[6].id,
        driverId: null,
        pickupLocation: "Sotheby's, 1334 York Ave",
        dropoffLocation: "Gagosian Gallery, 555 W 24th St",
        pickupTime: addHours(now, 2),
        status: "scheduled",
        price: 75,
        paymentStatus: "unpaid",
        notes: "Art transport - careful handling",
      },
      {
        clientId: allClients[7].id,
        driverId: null,
        pickupLocation: "Wells Capital, 9 W 57th St",
        dropoffLocation: "Four Seasons Restaurant",
        pickupTime: addHours(now, 1),
        status: "scheduled",
        price: 55,
        paymentStatus: "unpaid",
        notes: "Lunch meeting - tight schedule",
      },
      {
        clientId: allClients[2].id,
        driverId: null,
        pickupLocation: "JFK Terminal 1",
        dropoffLocation: "200 West St, Goldman Sachs HQ",
        pickupTime: setHours(setMinutes(addDays(now, 3), 0), 7),
        status: "scheduled",
        price: 195,
        paymentStatus: "unpaid",
        notes: "Return from London - flight BA117",
      },
      {
        clientId: allClients[3].id,
        driverId: null,
        pickupLocation: "The Ritz-Carlton, 50 Central Park S",
        dropoffLocation: "LaGuardia Airport",
        pickupTime: setHours(setMinutes(addDays(now, 2), 0), 15),
        status: "scheduled",
        price: 145,
        paymentStatus: "pending",
        notes: "Business trip to Miami",
      },
      {
        clientId: allClients[5].id,
        driverId: allDrivers[2].id,
        pickupLocation: "EWR Terminal B",
        dropoffLocation: "The Pierre Hotel",
        pickupTime: setHours(setMinutes(addDays(now, 4), 30), 21),
        status: "scheduled",
        price: 220,
        paymentStatus: "pending",
        notes: "Return from Moscow",
      },
      {
        clientId: allClients[6].id,
        driverId: allDrivers[3].id,
        pickupLocation: "Christie's, 20 Rockefeller Plaza",
        dropoffLocation: "Private residence, Upper East Side",
        pickupTime: setHours(setMinutes(subDays(now, 1), 0), 19),
        status: "completed",
        price: 95,
        paymentStatus: "paid",
        notes: "After auction - successful bid",
      },
    ]);

    console.log("✓ Created trips (including 8 unassigned)");

    await db.insert(messages).values([
      {
        senderId: allClients[0].id,
        receiverId: "bot",
        content: "I need a car for tomorrow at 2 PM to TEB. Same details as usual.",
        type: "sms",
        timestamp: subDays(now, 1),
      },
      {
        senderId: "bot",
        receiverId: allClients[0].id,
        content: "Certainly, Ms. Sterling. 15 CPW to Teterboro for tomorrow at 2:00 PM. SUV requested. I've scheduled James for you. Confirmation sent to your calendar.",
        type: "sms",
        timestamp: subDays(now, 1),
      },
      {
        senderId: allClients[0].id,
        receiverId: "bot",
        content: "Perfect, thank you.",
        type: "sms",
        timestamp: subDays(now, 1),
      },
      {
        senderId: "bot",
        receiverId: allDrivers[0].id,
        content: "New Trip Assignment: Pickup Ms. Sterling at 15 CPW tomorrow @ 14:00. Dropoff: TEB. Notes: Quiet ride, Sparkling water.",
        type: "internal",
        timestamp: subDays(now, 1),
      },
      {
        senderId: allClients[2].id,
        receiverId: "bot",
        content: "Need pickup from office to JFK in 3 hours. International terminal.",
        type: "sms",
        timestamp: now,
      },
      {
        senderId: "bot",
        receiverId: allClients[2].id,
        content: "Good afternoon, Ms. Chen. I've scheduled your pickup from Goldman Sachs HQ to JFK Terminal 1 in 3 hours. Your preferred sedan will be ready. Have a safe flight!",
        type: "sms",
        timestamp: now,
      },
      {
        senderId: allClients[7].id,
        receiverId: "bot",
        content: "Need a car to Four Seasons in 1 hour. Lunch meeting.",
        type: "sms",
        timestamp: now,
      },
      {
        senderId: "bot",
        receiverId: allClients[7].id,
        content: "Mr. Wells, your car is being arranged for pickup at 9 W 57th St in 1 hour. Destination: Four Seasons Restaurant. I'll have a driver assigned shortly.",
        type: "sms",
        timestamp: now,
      },
    ]);

    console.log("✓ Created messages");
    console.log("\n✅ Database seeded successfully with extended test data!");
    console.log(`   - ${allClients.length} clients with RAG profiles`);
    console.log(`   - ${allDrivers.length} drivers`);
    console.log(`   - 13 trips (8 pending driver assignment)`);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
