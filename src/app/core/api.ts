import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable, expand, map, reduce, EMPTY } from 'rxjs';

export const API_ROOT = 'http://127.0.0.1:8000/api/';
export interface Row { id: string | number; [key: string]: any; }
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[]; }
export interface User { id: number; name: string; email: string; role: 'admin' | 'traveler'; }
export interface Session { token: string; user: User; }
export const storedSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem('goruta.session') || localStorage.getItem('goruta.session') || 'null'); }
  catch { return null; }
};
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = storedSession()?.token;
  return next(token && request.url.startsWith(API_ROOT)
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  get<T>(path: string): Observable<T> { return this.http.get<T>(API_ROOT + path); }
  post<T>(path: string, body: unknown): Observable<T> { return this.http.post<T>(API_ROOT + path, body); }
  delete(path: string) { return this.http.delete(API_ROOT + path); }
  // Recorre únicamente nuestro catálogo local, sin importar datos de proveedores.
  all<T = Row>(resource: string): Observable<T[]> {
    return this.get<Page<T>>(`${resource}/`).pipe(
      expand(page => page.next ? this.http.get<Page<T>>(page.next) : EMPTY),
      map(page => page.results), reduce((all, page) => [...all, ...page], [] as T[]));
  }
  save(resource: string, data: Record<string, unknown>, id?: string | number): Observable<Row> {
    return id === undefined ? this.post<Row>(`${resource}/`, data)
      : this.http.patch<Row>(`${API_ROOT}${resource}/${encodeURIComponent(id)}/`, data);
  }
  upload(resource: string, id: string | number, file: File) {
    const form = new FormData(); form.append('image', file);
    return this.post<Row>(`${resource}/${encodeURIComponent(id)}/image/`, form);
  }
  image(path: string): string {
    return path?.startsWith('/media/') ? 'http://127.0.0.1:8000' + path : path || '/images/catalog-placeholder.svg';
  }
  error(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar. Inicia MySQL en XAMPP y la API en el puerto 8000.';
      if (error.status === 401) return 'Tu sesión terminó. Inicia sesión nuevamente.';
      const format = (value: any): string => typeof value === 'string' ? value : Array.isArray(value)
        ? value.map(format).join(' ') : value && typeof value === 'object'
        ? Object.entries(value).map(([key, val]) => `${key}: ${format(val)}`).join(' · ') : String(value);
      return format(error.error);
    }
    return 'No se pudo completar la operación.';
  }
}
