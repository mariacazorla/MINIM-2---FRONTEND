import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateRequest,
  RequestFilters,
  RequestResponse,
  RequestsPage,
  UpdateRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/requests`;

  // El interceptor existente añade el token, igual que para Dates y Users.
  getRequests(page: number, limit: number, filters: RequestFilters): Observable<RequestsPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.archived) params = params.set('archived', true);
    return this.http.get<RequestsPage>(this.baseUrl, { params });
  }

  getRequest(id: string): Observable<RequestResponse> {
    return this.http.get<RequestResponse>(`${this.baseUrl}/${id}`);
  }

  createRequest(data: CreateRequest): Observable<RequestResponse> {
    return this.http.post<RequestResponse>(this.baseUrl, data);
  }

  updateRequest(id: string, data: UpdateRequest): Observable<RequestResponse> {
    return this.http.put<RequestResponse>(`${this.baseUrl}/${id}`, data);
  }

  archiveRequest(id: string): Observable<RequestResponse> {
    return this.http.post<RequestResponse>(`${this.baseUrl}/${id}/archive`, {});
  }

  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
