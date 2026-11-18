import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { adminGuard } from './core/auth';
import { API_ROOT } from './core/api';
import { firstValueFrom, Observable } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('rechaza un rol admin inventado en el navegador si el servidor devuelve viajero', async () => {
    sessionStorage.setItem('goruta.session', JSON.stringify({ token: 'demo', user: { role: 'admin' } }));
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as Observable<boolean | UrlTree>;
    const pending = firstValueFrom(result);
    TestBed.inject(HttpTestingController).expectOne(API_ROOT + 'auth/me/').flush({ id: 2, name: 'Viajero', email: 'a@b.com', role: 'traveler' });
    const decision = await pending;
    expect(decision instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(decision as UrlTree)).toBe('/');
    sessionStorage.clear();
    TestBed.inject(HttpTestingController).verify();
  });
});
