import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { RequestForm } from './request-form';

describe('RequestForm', () => {
  let fixture: ComponentFixture<RequestForm>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/requests`;
  const request = {
    _id: 'r1',
    title: 'Titulo',
    body: 'Texto',
    date: 'd1',
    user: 'u1',
    status: 'pending',
    deleted: false,
    history: [],
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(AuthService).login({ email: 'a@b.c', password: 'test' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 't', user: { _id: 'u1', role: 'user' } });
    fixture = TestBed.createComponent(RequestForm);
  });
  afterEach(() => http.verify());

  it('creates for the route date without author or status, rejecting blank text', () => {
    fixture.componentRef.setInput('dateId', 'd1');
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiUrl}/dates/d1`)
      .flush({ date: { _id: 'd1', users: [{ _id: 'u1', name: 'Ana' }] } });
    const c = fixture.componentInstance;
    c.form.setValue({ title: '   ', body: 'Texto' });
    c.save();
    http.expectNone(url);
    c.form.setValue({ title: ' Titulo ', body: ' Texto ' });
    c.save();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Titulo', body: 'Texto', date: 'd1' });
    req.flush({ request });
  });

  it('loads and edits only title and body, preserving input on a server conflict', () => {
    fixture.componentRef.setInput('id', 'r1');
    fixture.detectChanges();
    http.expectOne(`${url}/r1`).flush({ request });
    const c = fixture.componentInstance;
    c.form.controls.title.setValue('Editado');
    c.save();
    const req = http.expectOne(`${url}/r1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'Editado', body: 'Texto' });
    req.flush(
      { message: 'La solicitud ya esta archivada' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(c.error()).toContain('archivada');
    expect(c.form.controls.title.value).toBe('Editado');
    expect(c.saving()).toBe(false);
  });

  it('makes an archived request read only and hides save', async () => {
    fixture.componentRef.setInput('id', 'r1');
    fixture.detectChanges();
    http.expectOne(`${url}/r1`).flush({ request: { ...request, deleted: true } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
    fixture.componentInstance.save();
    http.expectNone(`${url}/r1`);
  });

  it('does not allow creating for a date the current user does not belong to', () => {
    fixture.componentRef.setInput('dateId', 'd1');
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiUrl}/dates/d1`)
      .flush({ date: { _id: 'd1', users: [{ _id: 'u2' }] } });
    expect(fixture.componentInstance.canSave()).toBe(false);
    fixture.componentInstance.save();
    http.expectNone(url);
  });
});
