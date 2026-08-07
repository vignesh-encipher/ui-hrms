import API from './api';

export interface TicketReply {
  authorId?: string;
  authorName?: string;
  message: string;
  timestamp?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string; // HR, IT, Payroll, Finance, Admin
  raisedByEmployeeId?: string;
  raisedByName?: string;
  priority: string; // Low, Medium, High
  slaHours?: number;
  status: string; // Open, In progress, Resolved
  assignedToEmployeeId?: string;
  assignedToName?: string;
  createdAt?: string;
  resolvedAt?: string;
  replies?: TicketReply[];
}

export interface RaiseTicketPayload {
  subject: string;
  description: string;
  category: string;
  priority: string;
}

export const raiseTicket = async (payload: RaiseTicketPayload): Promise<Ticket> => {
  const res = await API.post('/tickets/raise', payload);
  return res.data;
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  try {
    const res = await API.get('/tickets');
    return res.data || [];
  } catch (err) {
    return [];
  }
};

export const getTicketById = async (id: string): Promise<Ticket | null> => {
  try {
    const res = await API.get(`/tickets/${id}`);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const assignTicket = async (id: string): Promise<Ticket> => {
  const res = await API.post(`/tickets/assign/${id}`);
  return res.data;
};

export const replyToTicket = async (id: string, message: string): Promise<Ticket> => {
  const res = await API.post(`/tickets/reply/${id}`, { message });
  return res.data;
};

export const resolveTicket = async (id: string): Promise<Ticket> => {
  const res = await API.post(`/tickets/resolve/${id}`);
  return res.data;
};
