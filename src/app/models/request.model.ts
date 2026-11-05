import { DateStatus } from './date.model';
import { GradeUser } from './grade.model';

export type RequestStatus = 'pending' | 'accepted' | 'denied';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  denied: 'Denegada',
};

export interface RequestHistory {
  _id?: string;
  message: string;
  changedAt: string;
  byAdmin: boolean;
}

// Las operaciones individuales devuelven los ids de las relaciones.
export interface Solicitud {
  _id: string;
  title: string;
  body: string;
  date: string;
  user: string;
  status: RequestStatus;
  history: RequestHistory[];
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// El listado devuelve populate; una relacion eliminada puede llegar como null.
export interface RequestListItem extends Omit<Solicitud, 'user' | 'date'> {
  user: GradeUser | null;
  date: { _id: string; status: DateStatus; users: string[] } | null;
}

export interface RequestsPage {
  requests: RequestListItem[];
  total: number;
  page: number;
  pages: number;
}

export interface RequestResponse {
  request: Solicitud;
}

export interface RequestFilters {
  search: string;
  status: '' | RequestStatus;
  archived: boolean;
}

export type CreateRequest = Pick<Solicitud, 'title' | 'body' | 'date'>;
export type UpdateRequest = Pick<Solicitud, 'title' | 'body'>;
