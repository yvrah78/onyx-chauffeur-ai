import { db } from "./db";
import { 
  users, clients, ragProfiles, drivers, trips, messages, conversations,
  type User, type InsertUser,
  type Client, type InsertClient,
  type RagProfile, type InsertRagProfile,
  type Driver, type InsertDriver,
  type Trip, type InsertTrip,
  type Message, type InsertMessage,
  type Conversation, type InsertConversation,
} from "@shared/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientByPhone(phone: string): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;

  // RAG Profiles
  getRagProfile(clientId: string): Promise<RagProfile | undefined>;
  createRagProfile(profile: InsertRagProfile): Promise<RagProfile>;
  updateRagProfile(clientId: string, profile: Partial<InsertRagProfile>): Promise<RagProfile | undefined>;

  // Drivers
  getDriver(id: string): Promise<Driver | undefined>;
  listDrivers(): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriverStatus(id: string, status: string): Promise<Driver | undefined>;

  // Trips
  getTrip(id: string): Promise<Trip | undefined>;
  listTrips(filters?: { clientId?: string; driverId?: string; status?: string }): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  listMessages(participantId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Conversations
  getConversation(participantId: string): Promise<Conversation | undefined>;
  listConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Stripe integration
  updateClientStripeInfo(clientId: string, stripeCustomerId: string): Promise<Client | undefined>;
  getProductsFromStripe(): Promise<any[]>;
  getPricesFromStripe(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.phone, phone));
    return client;
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(updateData).where(eq(clients.id, id)).returning();
    return client;
  }

  // RAG Profiles
  async getRagProfile(clientId: string): Promise<RagProfile | undefined> {
    const [profile] = await db.select().from(ragProfiles).where(eq(ragProfiles.clientId, clientId));
    return profile;
  }

  async createRagProfile(insertProfile: InsertRagProfile): Promise<RagProfile> {
    const [profile] = await db.insert(ragProfiles).values({
      ...insertProfile,
      preferences: insertProfile.preferences || sql`'[]'::jsonb`,
      notes: insertProfile.notes || sql`'[]'::jsonb`,
    }).returning();
    return profile;
  }

  async updateRagProfile(clientId: string, updateData: Partial<InsertRagProfile>): Promise<RagProfile | undefined> {
    const updateFields: any = { ...updateData, updatedAt: new Date() };
    
    // Handle JSONB fields properly
    if (updateData.preferences) {
      updateFields.preferences = sql`${JSON.stringify(updateData.preferences)}::jsonb`;
    }
    if (updateData.notes) {
      updateFields.notes = sql`${JSON.stringify(updateData.notes)}::jsonb`;
    }
    
    const [profile] = await db
      .update(ragProfiles)
      .set(updateFields)
      .where(eq(ragProfiles.clientId, clientId))
      .returning();
    return profile;
  }

  // Drivers
  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async listDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db.insert(drivers).values(insertDriver).returning();
    return driver;
  }

  async updateDriverStatus(id: string, status: string): Promise<Driver | undefined> {
    const [driver] = await db.update(drivers).set({ status }).where(eq(drivers.id, id)).returning();
    return driver;
  }

  // Trips
  async getTrip(id: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async listTrips(filters?: { clientId?: string; driverId?: string; status?: string; unassigned?: boolean; assigned?: boolean }): Promise<Trip[]> {
    let query = db.select().from(trips);

    const conditions = [];
    if (filters?.clientId) conditions.push(eq(trips.clientId, filters.clientId));
    if (filters?.driverId) conditions.push(eq(trips.driverId, filters.driverId));
    if (filters?.status) conditions.push(eq(trips.status, filters.status));
    if (filters?.unassigned) conditions.push(sql`${trips.driverId} IS NULL`);
    if (filters?.assigned) conditions.push(sql`${trips.driverId} IS NOT NULL`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(trips.pickupTime));
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }

  async updateTrip(id: string, updateData: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(trips.id, id))
      .returning();
    return trip;
  }

  async deleteTrip(id: string): Promise<boolean> {
    const result = await db.delete(trips).where(eq(trips.id, id));
    return true;
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async listMessages(participantId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, participantId),
          eq(messages.receiverId, participantId)
        )
      )
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Conversations
  async getConversation(participantId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.participantId, participantId));
    return conversation;
  }

  async listConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  async updateConversation(id: string, updateData: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Stripe integration
  async updateClientStripeInfo(clientId: string, stripeCustomerId: string): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ stripeCustomerId })
      .where(eq(clients.id, clientId))
      .returning();
    return client;
  }

  async getProductsFromStripe(): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = true ORDER BY name`
    );
    return result.rows as any[];
  }

  async getPricesFromStripe(): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = true ORDER BY unit_amount`
    );
    return result.rows as any[];
  }
}

export const storage = new DatabaseStorage();
