import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Api, Row } from '../../core/api';
import { Auth } from '../../core/auth';

type Resource = 'destinations' | 'flights' | 'hotels' | 'packages';
interface Field { key: string; label: string; type?: string; required?: boolean; options?: string[]; source?: Resource; min?: number; max?: number; }
@Component({ selector: 'app-admin', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html', styleUrl: './admin.scss' })
export class Admin {
  api = inject(Api); auth = inject(Auth); private router = inject(Router);
  tab = signal<Resource | 'overview' | 'bookings'>('overview');
  loading = signal(true); saving = signal(false); error = signal(''); notice = signal(''); search = signal('');
  data = signal<Record<Resource, Row[]>>({ destinations: [], flights: [], hotels: [], packages: [] });
  bookings = signal<Row[]>([]); stats = signal<Record<string, any>>({});
  editor = signal<Resource | null>(null); editingId: string | number | undefined;
  draft: Record<string, any> = {}; selectedFile: File | null = null; preview = signal('');
  deleteTarget = signal<{ resource: Resource; row: Row } | null>(null);
  tabs: { key: Resource; label: string }[] = [
    { key: 'destinations', label: 'Destinos' }, { key: 'flights', label: 'Vuelos' },
    { key: 'hotels', label: 'Hoteles' }, { key: 'packages', label: 'Paquetes' }];
  schemas: Record<Resource, Field[]> = {
    destinations: [
      { key: 'title', label: 'Ciudad / destino', required: true }, { key: 'country', label: 'País', required: true },
      { key: 'subtitle', label: 'Descripción' }, { key: 'region', label: 'Región', options: ['Asia', 'Europa', 'América'] },
      { key: 'type', label: 'Categoría destacada', options: ['Vuelos', 'Hoteles', 'Paquetes'] },
      { key: 'price', label: 'Precio mostrado (MXN)', type: 'number', min: 0, required: true },
      { key: 'originalPrice', label: 'Precio anterior (MXN)', type: 'number', min: 0, required: true },
      { key: 'tag', label: 'Etiqueta' }, { key: 'tagType', label: 'Estilo de etiqueta', options: ['local', 'teal', 'fuji', 'europe', 'tropical'] },
      { key: 'stars', label: 'Estrellas', type: 'number', min: 0, max: 5 },
      { key: 'hasFreeCancel', label: 'Cancelación gratuita', type: 'checkbox' },
      { key: 'hasBreakfast', label: 'Desayuno incluido', type: 'checkbox' },
      { key: 'isPublished', label: 'Publicado en la web', type: 'checkbox' }],
    flights: [
      { key: 'id', label: 'Código único (ej. FL-CUN-01)', required: true },
      { key: 'airline', label: 'Aerolínea', required: true }, { key: 'origin', label: 'Origen', required: true },
      { key: 'destination', label: 'Destino / aeropuerto', required: true },
      { key: 'destinationRef', label: 'Destino del catálogo (opcional)', source: 'destinations' },
      { key: 'departure', label: 'Salida (hora local)', type: 'datetime-local', required: true },
      { key: 'price', label: 'Precio por viajero (MXN)', type: 'number', min: 0, required: true },
      { key: 'availableSeats', label: 'Asientos disponibles', type: 'number', min: 0, required: true },
      { key: 'status', label: 'Estado', options: ['Activo', 'Programado', 'Lleno'] },
      { key: 'direct', label: 'Vuelo directo', type: 'checkbox' },
      { key: 'isPublished', label: 'Publicado en la web', type: 'checkbox' }],
    hotels: [
      { key: 'id', label: 'Código único (ej. HT-CUN-01)', required: true },
      { key: 'name', label: 'Nombre del hotel', required: true }, { key: 'city', label: 'Ciudad', required: true },
      { key: 'country', label: 'País', required: true },
      { key: 'destinationRef', label: 'Destino del catálogo (opcional)', source: 'destinations' },
      { key: 'description', label: 'Descripción' },
      { key: 'pricePerNight', label: 'Precio por noche / habitación (MXN)', type: 'number', min: 0, required: true },
      { key: 'stars', label: 'Estrellas', type: 'number', min: 1, max: 5 },
      { key: 'rating', label: 'Calificación (0 a 5)', type: 'number', min: 0, max: 5, required: true },
      { key: 'status', label: 'Estado', options: ['Disponible', 'Agotado'] },
      { key: 'hasFreeCancel', label: 'Cancelación gratuita', type: 'checkbox' },
      { key: 'hasBreakfast', label: 'Desayuno incluido', type: 'checkbox' },
      { key: 'isPublished', label: 'Publicado en la web', type: 'checkbox' }],
    packages: [
      { key: 'name', label: 'Nombre del paquete', required: true },
      { key: 'destination', label: 'Destino', source: 'destinations', required: true },
      { key: 'flight', label: 'Vuelo incluido', source: 'flights', required: true },
      { key: 'hotel', label: 'Hotel incluido', source: 'hotels', required: true },
      { key: 'nights', label: 'Noches', type: 'number', min: 1, required: true },
      { key: 'price', label: 'Precio especial por viajero (MXN)', type: 'number', min: 0, required: true },
      { key: 'description', label: 'Descripción del paquete' },
      { key: 'active', label: 'Publicado en la web', type: 'checkbox' }]
  };
  visibleRows = computed(() => {
    const tab = this.tab(); if (tab === 'overview' || tab === 'bookings') return [];
    const q = this.search().toLocaleLowerCase();
    return this.data()[tab].filter(row => `${row.id} ${this.label(row)}`.toLocaleLowerCase().includes(q));
  });
  constructor() { this.reload(); }
  reload() {
    this.loading.set(true);
    forkJoin({ destinations: this.api.all('destinations'), flights: this.api.all('flights'),
      hotels: this.api.all('hotels'), packages: this.api.all('packages'),
      bookings: this.api.all('bookings'), stats: this.api.get<Record<string, any>>('dashboard/') }).subscribe({
      next: result => { this.data.set(result); this.bookings.set(result.bookings); this.stats.set(result.stats); this.loading.set(false); },
      error: error => { this.error.set(this.api.error(error)); this.loading.set(false); }
    });
  }
  select(tab: Resource | 'overview' | 'bookings') { this.tab.set(tab); this.search.set(''); this.error.set(''); }
  label(row: Row) { return String(row['name'] || row['title'] || `${row.id} · ${row['origin']} → ${row['destination']}`); }
  title() { return this.tabs.find(t => t.key === this.tab())?.label || 'Catálogo'; }
  resource() { return this.tab() as Resource; }
  open(resource: Resource, row?: Row) {
    this.error.set(''); this.notice.set(''); this.editingId = row?.id;
    this.draft = row ? { ...row } : { isPublished: true, active: true, direct: true, region: 'América',
      type: 'Paquetes', tagType: 'local', stars: 3, rating: 3, status: resource === 'flights' ? 'Activo' : 'Disponible',
      nights: 1, availableSeats: 1, price: 0, originalPrice: 0, pricePerNight: 0,
      hasFreeCancel: false, hasBreakfast: false, image: '' };
    if (row?.['departure']) {
      const date = new Date(row['departure']);
      this.draft['departure'] = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    this.selectedFile = null; this.preview.set(this.api.image(this.draft['image'])); this.editor.set(resource);
  }
  close() { if (this.saving()) return; this.editor.set(null); this.selectedFile = null; this.releasePreview(); }
  releasePreview() { if (this.preview().startsWith('blob:')) URL.revokeObjectURL(this.preview()); }
  chooseImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Usa una imagen JPG, PNG o WebP de hasta 5 MB.'); return;
    }
    this.releasePreview(); this.selectedFile = file; this.preview.set(URL.createObjectURL(file)); this.error.set('');
  }
  removeImage() { this.releasePreview(); this.selectedFile = null; this.draft['image'] = ''; this.preview.set(this.api.image('')); }
  async save() {
    const resource = this.editor(); if (!resource || this.saving()) return;
    this.saving.set(true); this.error.set('');
    try {
      const payload: Record<string, unknown> = { image: this.draft['image'] || '' };
      for (const field of this.schemas[resource]) {
        if (field.key === 'id' && this.editingId !== undefined) continue;
        let value = this.draft[field.key];
        if (field.source) value = value === '' || value == null ? null : value;
        if (field.key === 'departure' && value) value = new Date(value).toISOString();
        if (value !== undefined) payload[field.key] = value;
      }
      const record = await firstValueFrom(this.api.save(resource, payload, this.editingId));
      this.editingId = record.id;
      if (this.selectedFile) await firstValueFrom(this.api.upload(resource, record.id, this.selectedFile));
      this.notice.set('Guardado en la base de datos.'); this.saving.set(false); this.close(); this.reload();
    } catch (error) { this.error.set(this.api.error(error) + (this.editingId ? ' El registro existe; puedes corregirlo y guardar de nuevo.' : '')); }
    finally { this.saving.set(false); }
  }
  async confirmDelete() {
    const target = this.deleteTarget(); if (!target || this.saving()) return;
    this.saving.set(true); this.error.set('');
    try {
      await firstValueFrom(this.api.delete(`${target.resource}/${encodeURIComponent(target.row.id)}/`));
      this.notice.set('Registro eliminado.'); this.deleteTarget.set(null); this.reload();
    } catch (error) { this.error.set(this.api.error(error)); this.deleteTarget.set(null); }
    finally { this.saving.set(false); }
  }
  async cancelBooking(row: Row) {
    if (this.saving()) return; this.saving.set(true);
    try { await firstValueFrom(this.api.post(`bookings/${row.id}/cancel/`, {})); this.reload(); }
    catch (error) { this.error.set(this.api.error(error)); }
    finally { this.saving.set(false); }
  }
  logout() {
    this.auth.logout().subscribe({ next: () => this.router.navigate(['/login']),
      error: () => { this.auth.clear(); this.router.navigate(['/login']); } });
  }
}
