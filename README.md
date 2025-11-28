# Onyx Chauffeur AI

AI-powered Black Car Service Management System

## Features

- 🤖 **AI Chatbot** with RAG memory (xAI embeddings + Vectra)
- 📅 **Google Calendar** sync for trip scheduling
- 💳 **Stripe** payment integration
- 🚗 **Driver Assignment** with animated UI
- 🌙 Premium dark luxury design

## Tech Stack

- **Frontend**: React + TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI**: xAI for embeddings, OpenAI (via Replit AI) for chat
- **Payments**: Stripe
- **Calendar**: Google Calendar API

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see .env.example)
4. Push database schema: `npm run db:push`
5. Seed database: `npx tsx server/seed.ts`
6. Start development: `npm run dev`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `XAI_API_KEY` - xAI API key for embeddings
- Google Calendar and Stripe are configured via Replit Integrations

## License

Private - All rights reserved
