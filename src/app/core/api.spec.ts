import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Api, API_ROOT, authInterceptor } from './api';

describe('Catálogo HTTP', () => {
  let api: Api; let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    api = TestBed.inject(Api); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); sessionStorage.clear(); });
  it('recupera todas las páginas del catálogo propio', () => {
    let rows: unknown[] = [];
    api.all('hotels').subscribe(value => rows = value);
    http.expectOne(API_ROOT + 'hotels/').flush({ count: 2, next: API_ROOT + 'hotels/?page=2', results: [{ id: 'uno' }] });
    http.expectOne(API_ROOT + 'hotels/?page=2').flush({ count: 2, next: null, results: [{ id: 'dos' }] });
    expect(rows).toEqual([{ id: 'uno' }, { id: 'dos' }]);
  });
  it('envía la sesión en escrituras y sube las fotos como multipart', () => {
    sessionStorage.setItem('goruta.session', JSON.stringify({ token: 'token-demo', user: { role: 'admin' } }));
    api.save('hotels', { name: 'Hotel propio' }, 'HT-01').subscribe();
    const save = http.expectOne(API_ROOT + 'hotels/HT-01/');
    expect(save.request.method).toBe('PATCH');
    expect(save.request.headers.get('Authorization')).toBe('Bearer token-demo'); save.flush({ id: 'HT-01' });
    api.upload('hotels', 'HT-01', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })).subscribe();
    const upload = http.expectOne(API_ROOT + 'hotels/HT-01/image/');
    expect(upload.request.body instanceof FormData).toBe(true);
    expect(upload.request.headers.has('Content-Type')).toBe(false); upload.flush({ id: 'HT-01' });
  });
});
