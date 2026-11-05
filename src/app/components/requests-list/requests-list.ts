import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import {
  DATE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  RequestFilters,
  RequestListItem,
  RequestStatus,
} from '../../models';
import { AuthService } from '../../services/auth.service';
import { RequestService } from '../../services/request.service';
import { apiErrorMessage } from '../../utils/api-error';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-requests-list',
  imports: [FormsModule, RouterLink, DatePipe, Pagination, ConfirmModal],
  templateUrl: './requests-list.html',
  styleUrl: './requests-list.css',
})
export class RequestsList implements OnInit {
  private service = inject(RequestService);
  private auth = inject(AuthService);
  private pageRequests = new Subject<number>();

  isAdmin = this.auth.isAdmin;
  labels = REQUEST_STATUS_LABELS;
  dateLabels = DATE_STATUS_LABELS;
  statuses = Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[];
  requests = signal<RequestListItem[]>([]);
  page = signal(1);
  total = signal(0);
  totalPages = signal(1);
  search = signal('');
  status = signal<RequestFilters['status']>('');
  archived = signal(false);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  selected = signal<RequestListItem | null>(null);

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.service
            .getRequests(page, 10, {
              search: this.search().trim(),
              status: this.status(),
              archived: this.archived(),
            })
            .pipe(
              tap((response) => {
                this.requests.set(response.requests);
                this.total.set(response.total);
                this.page.set(response.page);
                this.totalPages.set(Math.max(1, response.pages));
              }),
              catchError((err: HttpErrorResponse) => {
                this.requests.set([]);
                this.error.set(apiErrorMessage(err));
                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.pageRequests.next(page);
  }

  canManage(request: RequestListItem): boolean {
    return this.isAdmin() || request.user?._id === this.auth.user()?._id;
  }

  askRemove(request: RequestListItem): void {
    if (this.canManage(request) && !this.busy()) this.selected.set(request);
  }

  confirmRemove(): void {
    const request = this.selected();
    if (!request || this.busy() || !this.canManage(request)) return;
    this.selected.set(null);
    this.busy.set(true);
    this.error.set('');
    const operation: Observable<unknown> = request.deleted
      ? this.service.deleteRequest(request._id)
      : this.service.archiveRequest(request._id);
    operation.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () =>
        this.loadPage(this.requests().length === 1 ? Math.max(1, this.page() - 1) : this.page()),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }
}
