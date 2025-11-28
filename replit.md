# Onyx Chauffeur AI - Sistema de Gestión para Black Car Service

## Descripción del Proyecto

Sistema completo de gestión para empresa de servicio de transporte privado (Black Car / Private Chauffeur) con chatbot AI integrado, sistema RAG para memoria de clientes, y capacidades de pago con Stripe.

## Arquitectura

### Stack Tecnológico
- **Frontend**: React + TypeScript, Vite, TailwindCSS v4, Shadcn/UI
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL (Neon) con Drizzle ORM
- **AI**: OpenAI (via Replit AI Integrations) para chatbot con RAG
- **Pagos**: Stripe (Sandbox)
- **SMS**: Twilio (pendiente de configuración)

### Funcionalidades Principales

#### 1. **Chatbot AI con RAG**
- Responde automáticamente mensajes de clientes por SMS
- Memoria personalizada por cliente (RAG Profile)
- Extrae y actualiza preferencias automáticamente
- Maneja solicitudes de reservas
- Contexto histórico de conversaciones

#### 2. **Gestión de Clientes**
- Perfiles completos con información de contacto
- RAG Profiles con preferencias, notas y resumen
- Historial de viajes
- Integración con Stripe (Customer IDs)

#### 3. **Gestión de Viajes**
- Calendario de despacho
- Asignación de choferes
- Estados: scheduled, in-progress, completed, cancelled
- Tracking de pagos

#### 4. **Sistema de Pagos**
- Generación de links de pago con Stripe
- Tracking de estado de pagos
- Webhook de Stripe para sincronización automática

#### 5. **Mensajería**
- Chat interno entre clientes, choferes y bot
- Historial de conversaciones
- Soporte para SMS, WhatsApp (futuro) e internal

## Estructura de Base de Datos

### Tablas Principales
- `users`: Usuarios admin/dispatchers
- `clients`: Clientes del servicio
- `rag_profiles`: Perfiles de memoria AI por cliente
- `drivers`: Choferes
- `trips`: Viajes/reservas
- `messages`: Mensajes SMS/chat
- `conversations`: Hilos de conversación
- `stripe.*`: Esquema gestionado por stripe-replit-sync

### Schema Pattern
- IDs: UUID generados con `gen_random_uuid()`
- Timestamps: created_at, updated_at
- JSONB para arrays (preferences, notes, metadata)
- Foreign keys con onDelete cascade

## APIs Disponibles

### Clientes
- `GET /api/clients` - Lista todos los clientes
- `GET /api/clients/:id` - Detalles + RAG profile
- `POST /api/clients` - Crear cliente

### Choferes
- `GET /api/drivers` - Lista choferes
- `POST /api/drivers` - Crear chofer
- `PATCH /api/drivers/:id/status` - Actualizar estado

### Viajes
- `GET /api/trips?clientId=&driverId=&status=` - Lista con filtros
- `POST /api/trips` - Crear viaje (auto-sincroniza con Google Calendar)
- `PATCH /api/trips/:id` - Actualizar viaje (auto-sincroniza, elimina evento si se cancela)
- `DELETE /api/trips/:id` - Eliminar viaje (elimina evento del calendario)

### Mensajes y AI
- `GET /api/messages/:participantId` - Mensajes de un participante
- `POST /api/messages` - Crear mensaje
- `POST /api/chat` - Endpoint de chatbot AI (envía mensaje, recibe respuesta)

### Pagos
- `POST /api/payment-link` - Generar link de pago Stripe

### Google Calendar
- `GET /api/calendar/events` - Listar próximos eventos del calendario
- `POST /api/calendar/sync-trip/:tripId` - Sincronizar viaje específico con calendario

### Stats
- `GET /api/stats` - Métricas del dashboard

## Integraciones

### ✅ OpenAI (AI Integrations) - Chat
- Usa Replit AI Integrations (sin API key propia)
- Variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Modelo: gpt-4o-mini
- Funciones: Chatbot, extracción de preferencias, booking intent

### ✅ xAI - Embeddings (RAG)
- API de xAI para embeddings vectoriales
- Base URL: `https://api.x.ai/v1`
- Variable: `XAI_API_KEY`
- Modelo: v1 (embedding model)
- Funciones: Generación de embeddings para memoria RAG de clientes y choferes

### ✅ Stripe
- Connector configurado
- stripe-replit-sync instalado
- Webhook automático configurado
- Schema `stripe.*` sincronizado

### ✅ Google Calendar
- Connector configurado
- googleapis instalado
- Sincronización automática de viajes a calendario
- Eventos con colores por estado (azul=scheduled, naranja=in-progress, verde=completed, rojo=cancelled)
- Recordatorios automáticos (1 hora y 15 min antes)
- Los choferes pueden suscribirse al calendario desde sus iPhones

### ⏳ Twilio (Pendiente)
- Usuario rechazó configuración de connector inicial
- Pendiente de compra de número telefónico
- Para configurar: solicitar credenciales y guardar como secrets
- Funcionalidad: envío/recepción de SMS automáticos

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run db:push` - Sincronizar schema con DB
- `tsx server/seed.ts` - Poblar DB con datos de ejemplo

## Datos de Ejemplo (Seed)

El seed crea:
- 2 clientes con RAG profiles completos
- 2 choferes (1 disponible, 1 ocupado)
- 3 viajes en diferentes estados
- Historial de mensajes de ejemplo

## Diseño Visual

### Tema: "Dark Luxury / Midnight Chauffeur"
- Paleta: Negro profundo (#0a0a0a) con acentos Oro/Bronce (#BFA975)
- Tipografía: Outfit (display) + Inter (body)
- Efectos: Glass panels, backdrop blur, sombras sutiles
- Background: Textura de carbono generada con AI

### Componentes Clave
- Sidebar de navegación fija
- Dashboard con stats cards animados
- Calendario de selector de fecha
- Cards de viajes con estados visuales
- Chat interface con RAG profile sidebar

## Próximos Pasos / Roadmap

### Fase 1 (Actual) ✅
- [x] Diseño frontend premium
- [x] Backend con Express + PostgreSQL
- [x] Chatbot AI con RAG
- [x] Integración Stripe para pagos
- [x] APIs REST completas
- [x] Sincronización con Google Calendar

### Fase 2 (Siguiente)
- [ ] Configurar Twilio para SMS real
- [ ] Webhook de Twilio para recibir SMS
- [ ] Auto-respuesta por SMS con AI
- [ ] Notificaciones automáticas a choferes
- [ ] Confirmaciones de reserva automáticas

### Fase 3 (Futuro)
- [ ] Integración WhatsApp Business
- [ ] Llamadas telefónicas con AI
- [ ] Sistema de evaluación (evals)
- [ ] Métricas y analytics avanzados
- [ ] Panel de choferes dedicado
- [ ] App móvil para choferes

## Notas Importantes

### Twilio Integration
Usuario no completó la autorización del connector. Para usar Twilio:
1. Solicitar Account SID y Auth Token
2. Guardar como secrets con `request_env_var`
3. Implementar webhook endpoint `/api/twilio/webhook`
4. Configurar número de Twilio para apuntar al webhook

### RAG Profile Update
El sistema actualiza automáticamente los perfiles RAG:
- Extrae preferencias de conversaciones
- Identifica notas importantes (alergias, requests especiales)
- Actualiza summary cuando hay información significativa
- Usa JSON mode de OpenAI para structured output

### Stripe Payments
- Payment links se abren en nueva pestaña
- Webhooks automáticos sincronizan estado
- Customer IDs se guardan en tabla clients
- Productos/Precios se pueden crear con Stripe API

### Database Safety
- IDs usando UUID con `gen_random_uuid()`
- JSONB fields requieren casting: `sql\`'[]'::jsonb\``
- Usar `npm run db:push` para migraciones
- Schema stripe.* es READ-ONLY (gestionado por sync)

## Diseño de Color (Tailwind CSS Variables)

```css
--color-background: hsl(0 0% 4%);     /* #0a0a0a */
--color-foreground: hsl(0 0% 95%);    /* #f2f2f2 */
--color-primary: hsl(46 30% 55%);     /* Muted Gold */
--color-card: hsl(0 0% 7%);           /* #121212 */
--color-border: hsl(0 0% 15%);
```

## Usuario Target

Empresa de Black Car Service de lujo que busca:
- Automatizar comunicaciones con clientes
- Brindar experiencia personalizada premium
- Simplificar gestión de flota
- Reducir trabajo manual de dispatchers
- Mejorar eficiencia operativa
