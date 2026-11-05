import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RequestListItem } from '../../models';
import { AuthService } from '../../services/auth.service';
import { RequestsList } from './requests-list';

const item: RequestListItem = {
  _id: 'r1',
  title: 'Prorroga',
  body: 'Mas tiempo',
  status: 'pending',
  deleted: false,
  user: { _id: 'u1', name: 'Ana', email: 'a@b.c' },
  date: { _id: 'd1', status: 'ongoing', users: ['u1', 'u2'] },
  history: [],
  createdAt: '2026-11-05T10:00:00Z',
};

describe('RequestsList', () => {
  let fixture: ComponentFixture<RequestsList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/requests`;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login({ email: 'a@b.c', password: 'test' }).subscribe();
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 't', user: { _id: 'u1', role: 'user' } });
    fixture = TestBed.createComponent(RequestsList);
    fixture.detectChanges();
    http
      .expectOne(`${url}?page=1&limit=10`)
      .flush({ requests: [item], page: 1, pages: 2, total: 11 });
    await fixture.whenStable();
  });
  afterEach(() => http.verify());

  it('renders populated data and requests filtered pages from the server', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana');
    const c = fixture.componentInstance;
    c.loadPage(2);
    http.expectOne(`${url}?page=2&limit=10`).flush({ requests: [], total: 11, page: 2, pages: 2 });
    c.search.set('tiempo');
    c.status.set('pending');
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http
      .expectOne(`${url}?page=1&limit=10&search=tiempo&status=pending`)
      .flush({ requests: [], total: 0, page: 1, pages: 0 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(c.page()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('No hay solicitudes');
  });

  it('hides foreign actions and confirms an archive before reloading', () => {
    const c = fixture.componentInstance;
    expect(c.canManage({ ...item, user: { ...item.user!, _id: 'u2' } })).toBe(false);
    c.askRemove(item);
    http.expectNone((r) => r.method === 'POST');
    c.confirmRemove();
    http.expectOne(`${url}/r1/archive`).flush({ request: item });
    http.expectOne(`${url}?page=1&limit=10`).flush({ requests: [], page: 1, pages: 0, total: 0 });
  });

  it('shows API errors instead of reporting no results', async () => {
    fixture.componentInstance.loadPage(1);
    http
      .expectOne(`${url}?page=1&limit=10`)
      .flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Error de servidor');
    expect(fixture.nativeElement.textContent).not.toContain('No hay solicitudes');
  });
});
