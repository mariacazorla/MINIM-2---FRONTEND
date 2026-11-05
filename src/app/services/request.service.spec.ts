import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthService } from './auth.service';
import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/requests`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(RequestService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login({ email: 'a@b.c', password: 'test' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 'token', user: { _id: 'u1', role: 'user' } });
  });
  afterEach(() => http.verify());

  it('combines server pagination and filters, using the existing token interceptor', () => {
    service.getRequests(2, 10, { search: 'a+b', status: 'pending', archived: true }).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('search')).toBe('a+b');
    expect(req.request.params.get('status')).toBe('pending');
    expect(req.request.params.get('archived')).toBe('true');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({ requests: [], total: 0, page: 2, pages: 0 });
  });

  it('uses the six endpoints without putting author or token in the body', () => {
    service.createRequest({ title: 'T', body: 'B', date: 'd1' }).subscribe();
    const create = http.expectOne(url);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ title: 'T', body: 'B', date: 'd1' });
    create.flush({});
    service.getRequest('r1').subscribe();
    http.expectOne(`${url}/r1`).flush({});
    service.updateRequest('r1', { title: 'T2', body: 'B2' }).subscribe();
    const edit = http.expectOne(`${url}/r1`);
    expect(edit.request.method).toBe('PUT');
    expect(edit.request.body).toEqual({ title: 'T2', body: 'B2' });
    edit.flush({});
    service.archiveRequest('r1').subscribe();
    const archive = http.expectOne(`${url}/r1/archive`);
    expect(archive.request.method).toBe('POST');
    archive.flush({});
    service.deleteRequest('r1').subscribe();
    const remove = http.expectOne(`${url}/r1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });
});
