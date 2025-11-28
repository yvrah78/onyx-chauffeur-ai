import { LocalIndex } from "vectra";
import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";
import type { Client, Driver, Message, Trip } from "@shared/schema";

const DATA_DIR = "./.rag-data";
const CLIENT_INDEX_PATH = path.join(DATA_DIR, "clients");
const DRIVER_INDEX_PATH = path.join(DATA_DIR, "drivers");

function getXAIClient(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ 
    apiKey,
    baseURL: "https://api.x.ai/v1"
  });
}

async function getEmbedding(text: string): Promise<number[] | null> {
  const xai = getXAIClient();
  if (!xai) {
    console.log("RAG disabled: XAI_API_KEY not configured for embeddings");
    return null;
  }
  
  try {
    const response = await xai.embeddings.create({
      model: "v1",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("xAI Embedding generation failed:", error);
    return null;
  }
}

export class RagService {
  private clientIndex: LocalIndex | null = null;
  private driverIndex: LocalIndex | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      this.clientIndex = new LocalIndex(CLIENT_INDEX_PATH);
      this.driverIndex = new LocalIndex(DRIVER_INDEX_PATH);

      if (!(await this.clientIndex.isIndexCreated())) {
        await this.clientIndex.createIndex();
      }

      if (!(await this.driverIndex.isIndexCreated())) {
        await this.driverIndex.createIndex();
      }

      this.initialized = true;
      console.log("RAG Service initialized with Vectra local indexes");
    } catch (error) {
      console.error("Failed to initialize Vectra:", error);
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized && !!this.clientIndex && !!this.driverIndex;
  }

  async ingestClientMessage(
    client: Client,
    message: Message,
    aiResponse?: string
  ): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const content = aiResponse
      ? `Client ${client.name}: ${message.content}\nAI Response: ${aiResponse}`
      : `Client ${client.name}: ${message.content}`;

    const metadata = {
      entityId: client.id,
      entityType: "client",
      source: "conversation",
      timestamp: new Date().toISOString(),
      clientName: client.name,
      clientPhone: client.phone,
      messageType: message.type,
      messageId: message.id,
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      await this.clientIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest client message:", error);
    }
  }

  async ingestClientPreference(
    client: Client,
    preference: string,
    source: string = "extracted"
  ): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const content = `Client ${client.name} preference: ${preference}`;

    const metadata = {
      entityId: client.id,
      entityType: "client",
      source: "preference",
      timestamp: new Date().toISOString(),
      clientName: client.name,
      extractionSource: source,
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      await this.clientIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest client preference:", error);
    }
  }

  async ingestClientTrip(client: Client, trip: Trip, driverName?: string): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const pickupDate = trip.pickupTime instanceof Date 
      ? trip.pickupTime.toLocaleDateString() 
      : new Date(trip.pickupTime).toLocaleDateString();
    
    const content = `Trip for ${client.name}: From ${trip.pickupLocation} to ${trip.dropoffLocation} on ${pickupDate}. Status: ${trip.status}. Price: $${trip.price}. ${driverName ? `Driver: ${driverName}` : "Unassigned"}. ${trip.notes || ""}`;

    const metadata = {
      entityId: client.id,
      entityType: "client",
      source: "trip",
      timestamp: trip.pickupTime instanceof Date ? trip.pickupTime.toISOString() : trip.pickupTime,
      tripId: trip.id,
      tripStatus: trip.status,
      paymentStatus: trip.paymentStatus,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      const existing = await this.clientIndex!.listItemsByMetadata({
        tripId: { $eq: trip.id },
        entityId: { $eq: client.id },
      });

      if (existing.length > 0) {
        await this.clientIndex!.deleteItem(existing[0].id);
      }
      
      await this.clientIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest client trip:", error);
    }
  }

  async ingestDriverNote(
    driver: Driver,
    note: string,
    noteType: "performance" | "availability" | "feedback" | "communication"
  ): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const content = `${noteType.charAt(0).toUpperCase() + noteType.slice(1)} note for driver ${driver.name}: ${note}`;

    const metadata = {
      entityId: driver.id,
      entityType: "driver",
      source: noteType,
      timestamp: new Date().toISOString(),
      driverName: driver.name,
      driverPhone: driver.phone,
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      await this.driverIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest driver note:", error);
    }
  }

  async ingestDriverTrip(driver: Driver, trip: Trip, clientName?: string): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const pickupDate = trip.pickupTime instanceof Date 
      ? trip.pickupTime.toLocaleDateString() 
      : new Date(trip.pickupTime).toLocaleDateString();
    
    const content = `Trip assigned to ${driver.name} for client ${clientName || "Unknown"}: From ${trip.pickupLocation} to ${trip.dropoffLocation} on ${pickupDate}. Status: ${trip.status}. ${trip.notes || ""}`;

    const metadata = {
      entityId: driver.id,
      entityType: "driver",
      source: "trip",
      timestamp: trip.pickupTime instanceof Date ? trip.pickupTime.toISOString() : trip.pickupTime,
      tripId: trip.id,
      tripStatus: trip.status,
      clientName: clientName || "Unknown",
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      const existing = await this.driverIndex!.listItemsByMetadata({
        tripId: { $eq: trip.id },
        entityId: { $eq: driver.id },
      });

      if (existing.length > 0) {
        await this.driverIndex!.deleteItem(existing[0].id);
      }
      
      await this.driverIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest driver trip:", error);
    }
  }

  async ingestDriverMessage(
    driver: Driver,
    message: Message,
    context?: string
  ): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    const content = context
      ? `${context}\nDriver ${driver.name} message: ${message.content}`
      : `Driver ${driver.name} message: ${message.content}`;

    const metadata = {
      entityId: driver.id,
      entityType: "driver",
      source: "communication",
      timestamp: new Date().toISOString(),
      driverName: driver.name,
      messageType: message.type,
      messageId: message.id,
    };

    try {
      const vector = await getEmbedding(content);
      if (!vector) return;
      
      await this.driverIndex!.insertItem({
        vector,
        metadata: { ...metadata, text: content },
      });
    } catch (error) {
      console.error("Failed to ingest driver message:", error);
    }
  }

  async fetchContextForClient(
    clientId: string,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!(await this.ensureInitialized())) return [];

    try {
      const queryVector = await getEmbedding(query);
      if (!queryVector) return [];
      
      const results = await this.clientIndex!.queryItems(queryVector, query, limit);
      
      return results
        .filter(r => r.item.metadata.entityId === clientId)
        .map(r => r.item.metadata.text as string);
    } catch (error) {
      console.error("Failed to fetch client context:", error);
      return [];
    }
  }

  async fetchContextForDriver(
    driverId: string,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!(await this.ensureInitialized())) return [];

    try {
      const queryVector = await getEmbedding(query);
      if (!queryVector) return [];
      
      const results = await this.driverIndex!.queryItems(queryVector, query, limit);
      
      return results
        .filter(r => r.item.metadata.entityId === driverId)
        .map(r => r.item.metadata.text as string);
    } catch (error) {
      console.error("Failed to fetch driver context:", error);
      return [];
    }
  }

  async getClientHistory(clientId: string, limit: number = 20): Promise<{
    conversations: string[];
    trips: string[];
    preferences: string[];
  }> {
    if (!(await this.ensureInitialized())) {
      return { conversations: [], trips: [], preferences: [] };
    }

    try {
      const allItems = await this.clientIndex!.listItemsByMetadata({
        entityId: { $eq: clientId },
      });

      const conversations: string[] = [];
      const trips: string[] = [];
      const preferences: string[] = [];

      for (const item of allItems.slice(0, limit * 3)) {
        const text = item.metadata.text as string;
        switch (item.metadata.source) {
          case "conversation":
            conversations.push(text);
            break;
          case "trip":
            trips.push(text);
            break;
          case "preference":
            preferences.push(text);
            break;
        }
      }

      return { 
        conversations: conversations.slice(0, limit), 
        trips: trips.slice(0, limit), 
        preferences: preferences.slice(0, limit) 
      };
    } catch (error) {
      console.error("Failed to get client history:", error);
      return { conversations: [], trips: [], preferences: [] };
    }
  }

  async getDriverHistory(driverId: string, limit: number = 20): Promise<{
    trips: string[];
    notes: string[];
    communications: string[];
  }> {
    if (!(await this.ensureInitialized())) {
      return { trips: [], notes: [], communications: [] };
    }

    try {
      const allItems = await this.driverIndex!.listItemsByMetadata({
        entityId: { $eq: driverId },
      });

      const trips: string[] = [];
      const notes: string[] = [];
      const communications: string[] = [];

      for (const item of allItems.slice(0, limit * 3)) {
        const text = item.metadata.text as string;
        switch (item.metadata.source) {
          case "trip":
            trips.push(text);
            break;
          case "performance":
          case "availability":
          case "feedback":
            notes.push(text);
            break;
          case "communication":
            communications.push(text);
            break;
        }
      }

      return { 
        trips: trips.slice(0, limit), 
        notes: notes.slice(0, limit), 
        communications: communications.slice(0, limit) 
      };
    } catch (error) {
      console.error("Failed to get driver history:", error);
      return { trips: [], notes: [], communications: [] };
    }
  }

  async deleteClientData(clientId: string): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    try {
      const items = await this.clientIndex!.listItemsByMetadata({
        entityId: { $eq: clientId },
      });

      for (const item of items) {
        await this.clientIndex!.deleteItem(item.id);
      }
    } catch (error) {
      console.error("Failed to delete client data:", error);
    }
  }

  async deleteDriverData(driverId: string): Promise<void> {
    if (!(await this.ensureInitialized())) return;

    try {
      const items = await this.driverIndex!.listItemsByMetadata({
        entityId: { $eq: driverId },
      });

      for (const item of items) {
        await this.driverIndex!.deleteItem(item.id);
      }
    } catch (error) {
      console.error("Failed to delete driver data:", error);
    }
  }

  async getStats(): Promise<{
    clientDocs: number;
    driverDocs: number;
    initialized: boolean;
  }> {
    if (!(await this.ensureInitialized())) {
      return { clientDocs: 0, driverDocs: 0, initialized: false };
    }

    try {
      const clientItems = await this.clientIndex!.listItems();
      const driverItems = await this.driverIndex!.listItems();
      
      return { 
        clientDocs: clientItems.length, 
        driverDocs: driverItems.length, 
        initialized: true 
      };
    } catch (error) {
      console.error("Failed to get RAG stats:", error);
      return { clientDocs: 0, driverDocs: 0, initialized: false };
    }
  }
}

export const ragService = new RagService();
