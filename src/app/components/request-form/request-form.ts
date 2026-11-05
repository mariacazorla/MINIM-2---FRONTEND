import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { REQUEST_STATUS_LABELS, Solicitud, StudateDate } from '../../models';
import { AuthService } from '../../services/auth.service';
import { DateService } from '../../services/date.service';
import { RequestService } from '../../services/request.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './request-form.html',
  styleUrl: './request-form.css',
})
export class RequestForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private service = inject(RequestService);
  private dates = inject(DateService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Los ids vienen de la ruta gracias a withComponentInputBinding, como en UserForm.
  id = input<string>();
  dateId = input<string>();
  request = signal<Solicitud | null>(null);
  relatedDate = signal<StudateDate | null>(null);
  loading = signal(true);
  loadFailed = signal(false);
  saving = signal(false);
  error = signal('');
  labels = REQUEST_STATUS_LABELS;

  canSave = computed(() => {
    const request = this.request();
    if (this.id()) {
      return (
        !!request &&
        !request.deleted &&
        (this.auth.isAdmin() || request.user === this.auth.user()?._id)
      );
    }
    // Incluso un admin debe participar en la cita para crear una solicitud.
    return this.relatedDate()?.users.some((user) => user._id === this.auth.user()?._id) ?? false;
  });

  form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S/)]],
    body: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.service.getRequest(id).subscribe({
        next: ({ request }) => {
          this.request.set(request);
          this.form.patchValue({ title: request.title, body: request.body });
          if (!this.canSave()) this.form.disable();
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => this.failLoad(err),
      });
    } else {
      const dateId = this.dateId();
      if (!dateId) {
        this.error.set('Elige una cita desde Dates para crear la solicitud.');
        this.loadFailed.set(true);
        this.loading.set(false);
        return;
      }
      this.dates.getDate(dateId).subscribe({
        next: ({ date }) => {
          this.relatedDate.set(date);
          if (!this.canSave()) {
            this.form.disable();
            this.error.set('Solo puedes crear solicitudes de una cita en la que participas.');
          }
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => this.failLoad(err),
      });
    }
  }

  save(): void {
    if (this.loading() || this.loadFailed() || this.saving() || !this.canSave()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    const data = { title: values.title.trim(), body: values.body.trim() };
    const id = this.id();
    const operation = id
      ? this.service.updateRequest(id, data)
      : this.service.createRequest({ ...data, date: this.dateId()! });
    this.saving.set(true);
    this.error.set('');
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/dates/requests'], { replaceUrl: true }),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  private failLoad(err: HttpErrorResponse): void {
    this.error.set(apiErrorMessage(err));
    this.loadFailed.set(true);
    this.loading.set(false);
  }
}
