import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./ai-service";
import { ragService } from "./rag-service";
import { getUncachableStripeClient } from "./stripeClient";
import { calendarService } from "./calendar-service";
import { insertClientSchema, insertDriverSchema, insertTripSchema, insertMessageSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ Clients API ============
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.listClients();
      res.json({ clients });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const ragProfile = await storage.getRagProfile(client.id);
      res.json({ client, ragProfile });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      
      // Create initial RAG profile
      await storage.createRagProfile({
        clientId: client.id,
        summary: "New client profile",
        preferences: [],
        notes: [],
        lastInteraction: new Date(),
      });
      
      res.json({ client });
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  // ============ Drivers API ============
  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.listDrivers();
      res.json({ drivers });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  app.post("/api/drivers", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(validatedData);
      res.json({ driver });
    } catch (error) {
      res.status(400).json({ error: "Invalid driver data" });
    }
  });

  app.patch("/api/drivers/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const driver = await storage.updateDriverStatus(req.params.id, status);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      res.status(500).json({ error: "Failed to update driver status" });
    }
  });

  // ============ Trips API ============
  app.get("/api/trips", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.clientId) filters.clientId = req.query.clientId as string;
      if (req.query.driverId) filters.driverId = req.query.driverId as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.assigned === "unassigned") filters.unassigned = true;
      if (req.query.assigned === "assigned") filters.assigned = true;

      const trips = await storage.listTrips(filters);
      res.json({ trips });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  // Assign driver to trip
  app.post("/api/trips/:id/assign", async (req, res) => {
    try {
      const { driverId } = req.body;
      
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Validate driver exists and is available
      if (driverId) {
        const driver = await storage.getDriver(driverId);
        if (!driver) {
          return res.status(404).json({ error: "Driver not found" });
        }
      }

      // Update trip with driver assignment
      let updatedTrip = await storage.updateTrip(req.params.id, { driverId });
      if (!updatedTrip) {
        return res.status(500).json({ error: "Failed to assign driver" });
      }

      // Sync with Google Calendar
      try {
        if (updatedTrip.googleCalendarEventId) {
          await calendarService.updateTripEvent(updatedTrip, updatedTrip.googleCalendarEventId);
        } else {
          const eventId = await calendarService.createTripEvent(updatedTrip);
          if (eventId) {
            const refreshedTrip = await storage.updateTrip(updatedTrip.id, { googleCalendarEventId: eventId });
            if (refreshedTrip) {
              updatedTrip = refreshedTrip;
            }
          }
        }
      } catch (calendarError) {
        console.error("Calendar sync failed:", calendarError);
      }

      res.json({ trip: updatedTrip });
    } catch (error) {
      console.error("Assign driver error:", error);
      res.status(500).json({ error: "Failed to assign driver" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      // Parse pickupTime as Date if it's a string
      const body = { ...req.body };
      if (typeof body.pickupTime === 'string') {
        body.pickupTime = new Date(body.pickupTime);
      }
      
      const validatedData = insertTripSchema.parse(body);
      let trip = await storage.createTrip(validatedData);
      
      // Sync with Google Calendar
      try {
        const eventId = await calendarService.createTripEvent(trip);
        if (eventId) {
          const updatedTrip = await storage.updateTrip(trip.id, { googleCalendarEventId: eventId });
          if (updatedTrip) {
            trip = updatedTrip;
          }
        }
      } catch (calendarError) {
        console.error("Calendar sync failed:", calendarError);
      }

      // Ingest trip to ChromaDB for client RAG
      try {
        const client = await storage.getClient(trip.clientId);
        if (client) {
          const driver = trip.driverId ? await storage.getDriver(trip.driverId) : null;
          await ragService.ingestClientTrip(client, trip, driver?.name);
          
          // Also ingest for driver if assigned
          if (driver) {
            await ragService.ingestDriverTrip(driver, trip, client.name);
          }
        }
      } catch (ragError) {
        console.error("RAG ingestion failed:", ragError);
      }
      
      res.json({ trip });
    } catch (error) {
      console.error("Create trip error:", error);
      res.status(400).json({ error: "Invalid trip data" });
    }
  });

  app.patch("/api/trips/:id", async (req, res) => {
    try {
      const existingTrip = await storage.getTrip(req.params.id);
      if (!existingTrip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      let trip = await storage.updateTrip(req.params.id, req.body);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Sync with Google Calendar
      try {
        // Handle cancellation - delete calendar event
        if (trip.status === "cancelled" && trip.googleCalendarEventId) {
          await calendarService.deleteTripEvent(trip.googleCalendarEventId);
          const updatedTrip = await storage.updateTrip(trip.id, { googleCalendarEventId: null });
          if (updatedTrip) {
            trip = updatedTrip;
          }
        } else if (trip.googleCalendarEventId) {
          // Update existing event
          await calendarService.updateTripEvent(trip, trip.googleCalendarEventId);
        } else if (trip.status !== "cancelled") {
          // Create event if it doesn't exist (and trip is not cancelled)
          const eventId = await calendarService.createTripEvent(trip);
          if (eventId) {
            const updatedTrip = await storage.updateTrip(trip.id, { googleCalendarEventId: eventId });
            if (updatedTrip) {
              trip = updatedTrip;
            }
          }
        }
      } catch (calendarError) {
        console.error("Calendar sync failed:", calendarError);
      }

      // Update RAG with trip changes
      try {
        const client = await storage.getClient(trip.clientId);
        if (client) {
          const driver = trip.driverId ? await storage.getDriver(trip.driverId) : null;
          await ragService.ingestClientTrip(client, trip, driver?.name);
          
          if (driver) {
            await ragService.ingestDriverTrip(driver, trip, client.name);
          }
        }
      } catch (ragError) {
        console.error("RAG ingestion failed:", ragError);
      }
      
      res.json({ trip });
    } catch (error) {
      res.status(500).json({ error: "Failed to update trip" });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // Delete calendar event if exists
      if (trip.googleCalendarEventId) {
        try {
          await calendarService.deleteTripEvent(trip.googleCalendarEventId);
        } catch (calendarError) {
          console.error("Calendar delete failed:", calendarError);
        }
      }
      
      await storage.deleteTrip(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  // ============ Google Calendar API ============
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const events = await calendarService.listUpcomingEvents(20);
      res.json({ events });
    } catch (error) {
      console.error("Calendar fetch error:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/sync-trip/:tripId", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      let eventId = trip.googleCalendarEventId;
      
      if (eventId) {
        await calendarService.updateTripEvent(trip, eventId);
      } else {
        eventId = await calendarService.createTripEvent(trip);
        if (eventId) {
          await storage.updateTrip(trip.id, { googleCalendarEventId: eventId });
        }
      }
      
      res.json({ success: true, eventId });
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: "Failed to sync trip with calendar" });
    }
  });

  // ============ Messages & AI Chatbot API ============
  app.get("/api/messages/:participantId", async (req, res) => {
    try {
      const messages = await storage.listMessages(req.params.participantId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.json({ message });
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { clientPhone, message: userMessage } = req.body;
      
      if (!clientPhone || !userMessage) {
        return res.status(400).json({ error: "clientPhone and message are required" });
      }

      // Generate AI response (also creates client if new)
      const { response: aiResponse, client } = await aiService.generateResponse(clientPhone, userMessage);

      // Save user message
      const userMessageRecord = await storage.createMessage({
        senderId: client.id,
        receiverId: "bot",
        content: userMessage,
        type: "sms",
      });

      // Save AI response message
      await storage.createMessage({
        senderId: "bot",
        receiverId: client.id,
        content: aiResponse,
        type: "sms",
      });

      // Ingest message into ChromaDB for future semantic search
      await aiService.ingestMessage(client, userMessageRecord, aiResponse);

      res.json({ response: aiResponse, clientId: client.id });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // ============ Conversations API ============
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.listConversations();
      res.json({ conversations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // ============ Stripe Payment API ============
  app.post("/api/payment-link", async (req, res) => {
    try {
      const { clientId, tripId, amount, description } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Create or get Stripe customer
      let customerId = client.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: client.email || undefined,
          phone: client.phone,
          name: client.name,
          metadata: { clientId: client.id },
        });
        customerId = customer.id;
        await storage.updateClientStripeInfo(clientId, customerId);
      }

      // Create payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: description || `Trip #${tripId}`,
              },
              unit_amount: amount * 100, // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          clientId,
          tripId: tripId || "",
        },
      });

      // Update trip with payment link if tripId provided
      if (tripId) {
        await storage.updateTrip(tripId, {
          paymentStatus: "pending",
        });
      }

      res.json({ paymentLink: paymentLink.url });
    } catch (error) {
      console.error("Payment link error:", error);
      res.status(500).json({ error: "Failed to create payment link" });
    }
  });

  // ============ Analytics & Stats API ============
  app.get("/api/stats", async (req, res) => {
    try {
      const allTrips = await storage.listTrips();
      const activeTrips = allTrips.filter(t => t.status === "in-progress");
      const pendingTrips = allTrips.filter(t => t.status === "scheduled");
      const completedToday = allTrips.filter(t => {
        const today = new Date();
        const tripDate = new Date(t.createdAt!);
        return t.status === "completed" && 
               tripDate.toDateString() === today.toDateString();
      });

      const todayRevenue = completedToday.reduce((sum, trip) => sum + trip.price, 0);

      res.json({
        activeTrips: activeTrips.length,
        pendingTrips: pendingTrips.length,
        todayRevenue,
        completedToday: completedToday.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============ RAG (ChromaDB) API ============
  
  // Get RAG stats
  app.get("/api/rag/stats", async (req, res) => {
    try {
      const stats = await ragService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RAG stats" });
    }
  });

  // Get client RAG history
  app.get("/api/rag/client/:clientId", async (req, res) => {
    try {
      const history = await ragService.getClientHistory(req.params.clientId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client RAG history" });
    }
  });

  // Search client context
  app.post("/api/rag/client/:clientId/search", async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      const results = await ragService.fetchContextForClient(
        req.params.clientId,
        query,
        limit || 5
      );
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Failed to search client context" });
    }
  });

  // Get driver RAG history
  app.get("/api/rag/driver/:driverId", async (req, res) => {
    try {
      const history = await ragService.getDriverHistory(req.params.driverId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch driver RAG history" });
    }
  });

  // Search driver context
  app.post("/api/rag/driver/:driverId/search", async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
      const results = await ragService.fetchContextForDriver(
        req.params.driverId,
        query,
        limit || 5
      );
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Failed to search driver context" });
    }
  });

  // Add driver note (for dispatcher to add notes about drivers)
  app.post("/api/rag/driver/:driverId/note", async (req, res) => {
    try {
      const { note, noteType } = req.body;
      if (!note || !noteType) {
        return res.status(400).json({ error: "note and noteType are required" });
      }
      
      const validTypes = ["performance", "availability", "feedback", "communication"];
      if (!validTypes.includes(noteType)) {
        return res.status(400).json({ error: "Invalid noteType. Must be: " + validTypes.join(", ") });
      }
      
      const driver = await storage.getDriver(req.params.driverId);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      
      await ragService.ingestDriverNote(driver, note, noteType);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to add driver note" });
    }
  });

  // Add client preference manually
  app.post("/api/rag/client/:clientId/preference", async (req, res) => {
    try {
      const { preference } = req.body;
      if (!preference) {
        return res.status(400).json({ error: "preference is required" });
      }
      
      const client = await storage.getClient(req.params.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      await ragService.ingestClientPreference(client, preference, "manual");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to add client preference" });
    }
  });

  return httpServer;
}
