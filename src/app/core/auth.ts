import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { Api, Session, User, storedSession } from './api';

@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  user = signal<User | null>(storedSession()?.user || null);
  login(email: string, password: string, remember: boolean) {
    return this.api.post<Session>('auth/login/', { email, password }).pipe(tap(session => {
      this.clear();
      (remember ? localStorage : sessionStorage).setItem('goruta.session', JSON.stringify(session));
      this.user.set(session.user);
    }));
  }
  clear() {
    localStorage.removeItem('goruta.session'); sessionStorage.removeItem('goruta.session'); this.user.set(null);
  }
  logout() { return this.api.post('auth/logout/', {}).pipe(tap(() => this.clear())); }
  validate() {
    return this.api.get<User>('auth/me/').pipe(tap(user => this.user.set(user)));
  }
}

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth), router = inject(Router);
  if (!storedSession()?.token) return router.createUrlTree(['/login']);
  return auth.validate().pipe(map(user => user.role === 'admin' ? true : router.createUrlTree(['/'])),
    catchError(() => { auth.clear(); return of(router.createUrlTree(['/login'])); }));
};
