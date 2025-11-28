import OpenAI from "openai";
import { storage } from "./storage";
import { ragService } from "./rag-service";
import type { Client, RagProfile, Message } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export class AIService {
  /**
   * Generate AI response for client message using RAG context
   */
  async generateResponse(clientPhone: string, userMessage: string): Promise<{ response: string; client: Client }> {
    // Get or create client
    let client = await storage.getClientByPhone(clientPhone);
    
    if (!client) {
      // Create new client if doesn't exist
      client = await storage.createClient({
        name: "New Client",
        phone: clientPhone,
        email: null,
        avatar: null,
        stripeCustomerId: null,
      });

      // Create initial RAG profile
      await storage.createRagProfile({
        clientId: client.id,
        summary: "New client, building profile from interactions.",
        preferences: [],
        notes: [],
        lastInteraction: new Date(),
      });
    }

    // Get RAG profile for context
    const ragProfile = await storage.getRagProfile(client.id);
    
    // Build context from RAG profile (PostgreSQL)
    const ragContext = this.buildRagContext(client, ragProfile);

    // Fetch semantic context from ChromaDB (vector search)
    let chromaContext = "";
    try {
      const relevantDocs = await ragService.fetchContextForClient(
        client.id,
        userMessage,
        5
      );
      if (relevantDocs.length > 0) {
        chromaContext = `\n**Relevant History (Semantic Search):**\n${relevantDocs.map(d => `• ${d}`).join('\n')}`;
      }
    } catch (error) {
      console.error("ChromaDB context fetch failed:", error);
    }

    // Get recent conversation history
    const recentMessages = await storage.listMessages(client.id);
    const conversationHistory = recentMessages.slice(-10).map(msg => ({
      role: msg.senderId === 'bot' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI concierge for a luxury Black Car / Private Chauffeur service called "Onyx Chauffeur".
          
Your role is to:
- Handle booking requests professionally and efficiently
- Remember client preferences and provide personalized service
- Coordinate with drivers and dispatch team
- Send booking confirmations and reminders
- Handle payment requests via Stripe links when needed

**Client Context (RAG Profile):**
${ragContext}
${chromaContext}

**Important Guidelines:**
- Always be professional, courteous, and concise
- Use client's preferred name if available
- Reference their preferences when relevant (temperature, water, music, etc.)
- For new bookings, ask for: pickup location, dropoff location, date/time
- Confirm all booking details before finalizing
- If client mentions preferences, remember them for future interactions
- Keep responses brief and actionable (SMS-friendly)
- Use historical context from semantic search to provide personalized recommendations

**Current date:** ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        },
        ...conversationHistory,
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, I'm having trouble processing that request. Please try again.";

    // Update RAG profile with new interaction (PostgreSQL)
    await this.updateRagProfileFromConversation(client.id, userMessage, aiResponse);

    return { response: aiResponse, client };
  }

  /**
   * Ingest a message into ChromaDB for future semantic search
   */
  async ingestMessage(client: Client, message: Message, aiResponse?: string): Promise<void> {
    try {
      await ragService.ingestClientMessage(client, message, aiResponse);
    } catch (error) {
      console.error("Failed to ingest message to ChromaDB:", error);
    }
  }

  /**
   * Build RAG context string from client profile
   */
  private buildRagContext(client: Client, ragProfile: RagProfile | undefined): string {
    if (!ragProfile) {
      return `Client Name: ${client.name}\nPhone: ${client.phone}\nNo previous interaction history.`;
    }

    const preferences = Array.isArray(ragProfile.preferences) ? ragProfile.preferences : [];
    const notes = Array.isArray(ragProfile.notes) ? ragProfile.notes : [];

    return `
Client Name: ${client.name}
Phone: ${client.phone}
Email: ${client.email || 'Not provided'}

Summary: ${ragProfile.summary || 'No summary available'}

Preferences:
${preferences.length > 0 ? preferences.map(p => `- ${p}`).join('\n') : '- None recorded yet'}

Important Notes:
${notes.length > 0 ? notes.map(n => `- ${n}`).join('\n') : '- None recorded yet'}

Last Interaction: ${ragProfile.lastInteraction ? new Date(ragProfile.lastInteraction).toLocaleDateString() : 'Never'}
    `.trim();
  }

  /**
   * Extract and update RAG profile based on conversation
   */
  private async updateRagProfileFromConversation(clientId: string, userMessage: string, aiResponse: string): Promise<void> {
    const ragProfile = await storage.getRagProfile(clientId);
    
    if (!ragProfile) return;

    // Use AI to extract insights and update profile
    try {
      const extractionCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are analyzing a conversation to extract client preferences and important notes.
            
Current client profile:
- Summary: ${ragProfile.summary}
- Preferences: ${JSON.stringify(ragProfile.preferences)}
- Notes: ${JSON.stringify(ragProfile.notes)}

Based on the conversation below, extract:
1. Any new preferences (temperature, water type, music, route preferences, etc.)
2. Any important notes to remember (allergies, special requests, timing preferences, etc.)
3. An updated summary if new information is significant

Return ONLY a JSON object with this structure:
{
  "newPreferences": ["preference1", "preference2"],
  "newNotes": ["note1", "note2"],
  "updatedSummary": "updated summary text or null if no update needed"
}`,
          },
          {
            role: "user",
            content: `Client: ${userMessage}\nAI: ${aiResponse}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const extraction = JSON.parse(extractionCompletion.choices[0]?.message?.content || "{}");
      
      const currentPreferences = Array.isArray(ragProfile.preferences) ? ragProfile.preferences : [];
      const currentNotes = Array.isArray(ragProfile.notes) ? ragProfile.notes : [];

      const updatedPreferences = extraction.newPreferences?.length > 0
        ? [...currentPreferences, ...extraction.newPreferences]
        : currentPreferences;

      const updatedNotes = extraction.newNotes?.length > 0
        ? [...currentNotes, ...extraction.newNotes]
        : currentNotes;

      await storage.updateRagProfile(clientId, {
        preferences: updatedPreferences,
        notes: updatedNotes,
        summary: extraction.updatedSummary || ragProfile.summary,
        lastInteraction: new Date(),
      });
    } catch (error) {
      console.error("Error updating RAG profile:", error);
      // Still update last interaction time
      await storage.updateRagProfile(clientId, {
        lastInteraction: new Date(),
      });
    }
  }

  /**
   * Extract booking details from message
   */
  async extractBookingDetails(message: string): Promise<{
    pickup?: string;
    dropoff?: string;
    datetime?: string;
    specialRequests?: string;
  } | null> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract booking details from the message. Return JSON with: pickup, dropoff, datetime, specialRequests.
If information is not present, omit the field. Return null if no booking intent detected.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      return JSON.parse(completion.choices[0]?.message?.content || "null");
    } catch (error) {
      console.error("Error extracting booking details:", error);
      return null;
    }
  }
}

export const aiService = new AIService();
