import { AccountMenu } from '../../core/account-menu';
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface GlobalDestination {
  id: number;
  title: string;
  country: string;
  subtitle: string;
  tag: string;
  tagType: 'fuji' | 'local' | 'teal' | 'europe' | 'tropical';
  price: number;
  originalPrice: number;
  image: string;
  isFavorite: boolean;
  region: 'Asia' | 'Europa' | 'América';
  type: 'Vuelos' | 'Hoteles' | 'Paquetes';
  stars: number;
  hasFreeCancel: boolean;
  hasBreakfast: boolean;
}

import { Api, Row } from '../../core/api';
import { Auth } from '../../core/auth';
import { Catalog } from './catalog';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Catalog, AccountMenu],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  morning=signal(false); baggage=signal(false);
  extraServices=signal<string[]>([]);
  serviceOptions=[['petLimit','🐾 Admite mascotas'],['parking','🅿 Estacionamiento'],['kitchen','🍴 Cocina'],['accessible','♿ Entrada sin escalones'],['airConditioning','❄ Aire acondicionado']];
  toggleService(key:string){this.extraServices.update(items=>items.includes(key)?items.filter(x=>x!==key):[...items,key]);}
  wifi=signal(false); pool=signal(false); toggle=(value:boolean)=>!value;
  api = inject(Api); auth = inject(Auth);
  catalogQuery = signal('');
  catalogLoading = signal(false);
  catalogError = signal('');
  private favoriteIds = new Map<number, number>();
  constructor() { this.loadDestinations(); }
  loadDestinations() {
    this.catalogLoading.set(true); this.catalogError.set('');
    this.api.all<Row>('destinations').subscribe({
      next: rows => {
        this.destinations.set(rows.filter(row => row['isPublished'] !== false).map(row => ({ ...row,
          id: Number(row.id), price: Number(row['price']), originalPrice: Number(row['originalPrice']),
          image: this.api.image(row['image']) } as GlobalDestination)));
        this.catalogLoading.set(false);
      }, error: error => { this.catalogLoading.set(false); this.catalogError.set(this.api.error(error)); }
    });
    if (this.auth.user()) this.api.all<Row>('favorites').subscribe({
      next: rows => { this.favoriteIds = new Map(rows.map(row => [Number(row['destination']), Number(row.id)])); },
      error: error => this.showToast(this.api.error(error))
    });
  }
  showOffers(title: string) {
    this.heroSearchText.set(title);
    this.catalogQuery.set(title.trim());
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  // Active Booking Tab: 'vuelos' | 'hoteles' | 'paquetes'
  activeTab = signal<'vuelos' | 'hoteles' | 'paquetes'>('vuelos');

  // Hero Search input
  heroSearchText = signal('');

  // Flight search form state
  flightOrigin = signal('Ciudad de México (MEX)');
  flightDestination = signal('Tokyo (HND)');
  flightDates = signal('15 Nov - 25 Nov 2026');
  flightPassengers = signal('2 Pasajeros, Turista');
  flightClass = signal<'turista' | 'business' | 'primera'>('turista');
  flightDirectOnly = signal(false);

  // Hotel search form state
  hotelCityOrName = signal('París, Francia');
  hotelCheckIn = signal('2026-11-15');
  hotelCheckOut = signal('2026-11-22');
  hotelRoomsGuests = signal('1 Habitación, 2 Huéspedes');

  // Sidebar accordions state
  filtrosOpen = signal(true);
  tiposViajeOpen = signal(true);
  regionesOpen = signal(true);
  preciosOpen = signal(true);
  escalasOpen = signal(true);
  estrellasOpen = signal(true);
  alojamientoOpen = signal(true);
  serviciosOpen = signal(true);

  // Filter States
  selectedRegion = signal<string>('todos'); // 'todos', 'Asia', 'Europa', 'América'
  maxPrice = signal<number>(2500);
  filterDirectFlights = signal(false);
  filterMinStars = signal<number>(0);
  filterFreeCancellation = signal(false);
  filterBreakfast = signal(false);

  // Filter Checkboxes for destinations
  filterDestTokyo = signal(true);
  filterDestKyoto = signal(true);
  filterDestParis = signal(true);
  filterDestRome = signal(true);
  filterDestBali = signal(true);

  // Toast notification
  toastMessage = signal<string | null>(null);

  // Destinations Catalog
  destinations = signal<GlobalDestination[]>([]);

  // Carousel current slide
  currentSlide = signal(0);

  // Maximum slide limit
  maxSlide = computed(() => {
    const total = this.destinations().length;
    return Math.max(0, total - 3);
  });

  // Methods
  setTab(tab: 'vuelos' | 'hoteles' | 'paquetes') {
    this.activeTab.set(tab);
  }

  favoriteBusy = signal(false);
  toggleFavorite(id: number, event: MouseEvent) {
    event.stopPropagation();
    if (!this.auth.user()) { this.showToast('Inicia sesión para guardar favoritos.'); return; }
    if (this.favoriteBusy()) return;
    this.favoriteBusy.set(true);
    const favorite = this.favoriteIds.get(id);
    const request = favorite ? this.api.delete(`favorites/${favorite}/`) : this.api.post<Row>('favorites/', { destination: id });
    request.subscribe({
      next: (row: any) => {
        if (favorite) this.favoriteIds.delete(id); else this.favoriteIds.set(id, Number(row.id));
        this.destinations.update(items => items.map(item => item.id === id ? { ...item, isFavorite: !favorite } : item));
        this.favoriteBusy.set(false);
      }, error: error => { this.favoriteBusy.set(false); this.showToast(this.api.error(error)); }
    });
  }

  prevSlide() {
    this.currentSlide.update(curr => (curr > 0 ? curr - 1 : this.maxSlide()));
  }

  nextSlide() {
    this.currentSlide.update(curr => (curr < this.maxSlide() ? curr + 1 : 0));
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
  }

  onHeroSearch() { this.showOffers(this.heroSearchText()); }

  resetFilters() {
    this.extraServices.set([]);
    this.morning.set(false);this.baggage.set(false);this.wifi.set(false);this.pool.set(false);this.filterDirectFlights.set(false);
    this.selectedRegion.set('todos');
    this.maxPrice.set(2500);
    this.filterMinStars.set(0);
    this.filterFreeCancellation.set(false);
    this.filterBreakfast.set(false);
    this.heroSearchText.set('');
    this.catalogQuery.set('');
    this.showToast('Filtros restablecidos a valores por defecto');
  }

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3200);
  }
}
