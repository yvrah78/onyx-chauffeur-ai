async function apiRequest(method: string, path: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Clients
  getClients: () => apiRequest("GET", "/clients"),
  getClient: (id: string) => apiRequest("GET", `/clients/${id}`),
  createClient: (data: any) => apiRequest("POST", "/clients", data),

  // Drivers
  getDrivers: () => apiRequest("GET", "/drivers"),
  createDriver: (data: any) => apiRequest("POST", "/drivers", data),
  updateDriverStatus: (id: string, status: string) => 
    apiRequest("PATCH", `/drivers/${id}/status`, { status }),

  // Trips
  getTrips: (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest("GET", `/trips${params ? `?${params}` : ""}`);
  },
  getUnassignedTrips: () => apiRequest("GET", "/trips?assigned=unassigned"),
  createTrip: (data: any) => apiRequest("POST", "/trips", data),
  updateTrip: (id: string, data: any) => apiRequest("PATCH", `/trips/${id}`, data),
  assignDriver: (tripId: string, driverId: string) => 
    apiRequest("POST", `/trips/${tripId}/assign`, { driverId }),

  // Messages
  getMessages: (participantId: string) => apiRequest("GET", `/messages/${participantId}`),
  createMessage: (data: any) => apiRequest("POST", "/messages", data),
  
  // AI Chat
  chat: (clientPhone: string, message: string) => 
    apiRequest("POST", "/chat", { clientPhone, message }),

  // Conversations
  getConversations: () => apiRequest("GET", "/conversations"),

  // Payments
  createPaymentLink: (data: { clientId: string; tripId?: string; amount: number; description?: string }) =>
    apiRequest("POST", "/payment-link", data),

  // Stats
  getStats: () => apiRequest("GET", "/stats"),
};
