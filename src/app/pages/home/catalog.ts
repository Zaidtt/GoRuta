import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import { Api, Row } from '../../core/api';
import { Auth } from '../../core/auth';

@Component({ selector: 'app-catalog', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html', styleUrl: './catalog.scss' })
export class Catalog {
  api = inject(Api); auth = inject(Auth); private router = inject(Router);
  kind = input<'vuelos' | 'hoteles' | 'paquetes'>('vuelos'); query = input('');
  kindChange = output<'vuelos' | 'hoteles' | 'paquetes'>();
  categories: ('vuelos' | 'hoteles' | 'paquetes')[] = ['vuelos', 'hoteles', 'paquetes'];
  offers = signal<Record<string, Row[]>>({ vuelos: [], hoteles: [], paquetes: [] });
  bookings = signal<Row[]>([]); loading = signal(false); busy = signal(false); error = signal(''); notice = signal('');
  search = signal(''); selected = signal<Row | null>(null); travelers = 1; checkIn = ''; checkOut = '';
  rows = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    return this.offers()[this.kind()].filter(row => {
      const published = row['isPublished'] !== false && row['active'] !== false;
      const text = [row['name'], row['origin'], row['destinationDetails']?.title, row['destination'], row['city'], row['country'], row['airline']].join(' ').toLocaleLowerCase();
      return published && (!q || text.includes(q));
    });
  });
  constructor() {
    effect(() => this.search.set(this.query()), { allowSignalWrites: true });
    effect(() => { if (this.auth.user()) this.loadBookings(); else this.bookings.set([]); });
    this.reload();
  }
  reload() {
    this.loading.set(true); this.error.set('');
    forkJoin({ vuelos: this.api.all('flights'), hoteles: this.api.all('hotels'), paquetes: this.api.all('packages') }).subscribe({
      next: offers => { this.offers.set(offers); this.loading.set(false); },
      error: error => { this.error.set(this.api.error(error)); this.loading.set(false); }
    });
  }
  loadBookings() { this.api.all('bookings').subscribe({ next: rows => this.bookings.set(rows), error: error => this.error.set(this.api.error(error)) }); }
  title(row: Row) { return row['name'] || `${row['origin']} → ${row['destination']}`; }
  photo(row: Row) { return this.api.image(row['image'] || row['destinationDetails']?.image); }
  unavailable(row: Row) { return row['status'] === 'Agotado' || row['status'] === 'Lleno'
    || (this.kind() === 'vuelos' && (row['availableSeats'] < 1 || new Date(row['departure']) <= new Date()))
    || (this.kind() === 'paquetes' && (row['flightDetails']?.availableSeats < 1 || row['hotelDetails']?.status === 'Agotado' || new Date(row['flightDetails']?.departure) <= new Date())); }
  open(row: Row) {
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.error.set(''); this.notice.set(''); this.travelers = 1; this.checkIn = ''; this.checkOut = ''; this.selected.set(row);
  }
  async book() {
    const row = this.selected(); if (!row || this.busy()) return;
    this.busy.set(true); this.error.set('');
    const kind = this.kind();
    const body: Record<string, unknown> = { type: kind === 'vuelos' ? 'Vuelo' : kind === 'hoteles' ? 'Hotel' : 'Paquete', travelers: this.travelers };
    body[kind === 'vuelos' ? 'flight' : kind === 'hoteles' ? 'hotel' : 'package'] = row.id;
    if (kind !== 'vuelos') { body['checkIn'] = this.checkIn; body['checkOut'] = this.checkOut; }
    try {
      const booking = await firstValueFrom(this.api.post<Row>('bookings/', body));
      this.notice.set(`Reserva #${booking.id} guardada. Total: $${booking['amount']} MXN.`);
      this.selected.set(null); this.loadBookings(); this.reload();
    } catch (error) { this.error.set(this.api.error(error)); }
    finally { this.busy.set(false); }
  }
  async cancel(row: Row) {
    if (this.busy()) return; this.busy.set(true);
    try { await firstValueFrom(this.api.post(`bookings/${row.id}/cancel/`, {})); this.loadBookings(); this.reload(); }
    catch (error) { this.error.set(this.api.error(error)); }
    finally { this.busy.set(false); }
  }
}
