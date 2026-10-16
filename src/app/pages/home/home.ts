import { Component, signal, computed } from '@angular/core';
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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  // Navigation
  readonly navLinks = [
    { label: 'Inicio', active: true, href: '#hero' },
    { label: 'Vuelos', active: false, href: '#search-section' },
    { label: 'Hoteles', active: false, href: '#search-section' },
    { label: 'Paquetes', active: false, href: '#destinos' },
    { label: 'Nosotros', active: false, href: '#destinos' }
  ];

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
  destinations = signal<GlobalDestination[]>([
    {
      id: 1,
      title: 'Tokyo',
      country: 'Japón',
      subtitle: 'Bostiava & Shibuya, Tokyo',
      tag: 'Fuji Especial',
      tagType: 'fuji',
      price: 1500,
      originalPrice: 1900,
      image: 'images/tokyo-fuji.jpg',
      isFavorite: false,
      region: 'Asia',
      type: 'Vuelos',
      stars: 5,
      hasFreeCancel: true,
      hasBreakfast: true
    },
    {
      id: 2,
      title: 'París',
      country: 'Francia',
      subtitle: 'Torre Eiffel & Río Sena',
      tag: 'Europa Clásica',
      tagType: 'europe',
      price: 1420,
      originalPrice: 1800,
      image: 'images/paris.jpg',
      isFavorite: false,
      region: 'Europa',
      type: 'Paquetes',
      stars: 5,
      hasFreeCancel: true,
      hasBreakfast: true
    },
    {
      id: 3,
      title: 'Roma',
      country: 'Italia',
      subtitle: 'Coliseo Romano & Centro Histórico',
      tag: 'Tour Histórico',
      tagType: 'europe',
      price: 1380,
      originalPrice: 1750,
      image: 'images/rome.jpg',
      isFavorite: false,
      region: 'Europa',
      type: 'Hoteles',
      stars: 5,
      hasFreeCancel: true,
      hasBreakfast: false
    },
    {
      id: 4,
      title: 'Bali',
      country: 'Indonesia',
      subtitle: 'Villas Tropicales & Terrazas Ubud',
      tag: 'Paraíso Tropical',
      tagType: 'tropical',
      price: 1250,
      originalPrice: 1600,
      image: 'images/bali.jpg',
      isFavorite: false,
      region: 'Asia',
      type: 'Paquetes',
      stars: 5,
      hasFreeCancel: true,
      hasBreakfast: true
    },
    {
      id: 5,
      title: 'Kyoto',
      country: 'Japón',
      subtitle: 'Qukelad Hotel & Pagodas Gion',
      tag: 'Tour Local',
      tagType: 'local',
      price: 1500,
      originalPrice: 1900,
      image: 'images/kyoto.jpg',
      isFavorite: false,
      region: 'Asia',
      type: 'Hoteles',
      stars: 5,
      hasFreeCancel: false,
      hasBreakfast: true
    },
    {
      id: 6,
      title: 'Osaka',
      country: 'Japón',
      subtitle: 'Beobas Dotonbori, Osaka',
      tag: 'Tour Local',
      tagType: 'teal',
      price: 1500,
      originalPrice: 1900,
      image: 'images/osaka.jpg',
      isFavorite: false,
      region: 'Asia',
      type: 'Vuelos',
      stars: 4,
      hasFreeCancel: true,
      hasBreakfast: false
    }
  ]);

  // Carousel current slide
  currentSlide = signal(0);

  // Filtered destinations logic
  filteredDestinations = computed(() => {
    let list = this.destinations();
    const q = this.heroSearchText().trim().toLowerCase();
    const region = this.selectedRegion();
    const maxP = this.maxPrice();
    const minStars = this.filterMinStars();
    const freeCancel = this.filterFreeCancellation();
    const breakfast = this.filterBreakfast();

    if (q) {
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q)
      );
    }

    if (region !== 'todos') {
      list = list.filter(d => d.region === region);
    }

    if (maxP < 2500) {
      list = list.filter(d => d.price <= maxP);
    }

    if (minStars > 0) {
      list = list.filter(d => d.stars >= minStars);
    }

    if (freeCancel) {
      list = list.filter(d => d.hasFreeCancel);
    }

    if (breakfast) {
      list = list.filter(d => d.hasBreakfast);
    }

    return list;
  });

  // Maximum slide limit
  maxSlide = computed(() => {
    const total = this.filteredDestinations().length;
    return Math.max(0, total - 3);
  });

  // Methods
  setTab(tab: 'vuelos' | 'hoteles' | 'paquetes') {
    this.activeTab.set(tab);
    const label = tab === 'vuelos' ? 'Vuelos' : tab === 'hoteles' ? 'Hoteles' : 'Paquetes Completos';
    this.showToast(`Buscando por categoría: ${label}`);
  }

  toggleFavorite(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.destinations.update(items =>
      items.map(item => {
        if (item.id === id) {
          const next = !item.isFavorite;
          this.showToast(next ? `Guardado en favoritos: ${item.title}` : `Eliminado de favoritos: ${item.title}`);
          return { ...item, isFavorite: next };
        }
        return item;
      })
    );
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

  onSearchSubmit() {
    if (this.activeTab() === 'vuelos') {
      this.showToast(`Buscando vuelos de ${this.flightOrigin()} a ${this.flightDestination()}...`);
    } else if (this.activeTab() === 'hoteles') {
      this.showToast(`Buscando alojamiento en ${this.hotelCityOrName()}...`);
    } else {
      this.showToast(`Buscando paquetes vacacionales completos...`);
    }
  }

  onHeroSearch() {
    const q = this.heroSearchText().trim();
    if (q) {
      this.showToast(`Filtrando catálogo por: "${q}"`);
      const target = document.getElementById('search-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  resetFilters() {
    this.selectedRegion.set('todos');
    this.maxPrice.set(2500);
    this.filterMinStars.set(0);
    this.filterFreeCancellation.set(false);
    this.filterBreakfast.set(false);
    this.heroSearchText.set('');
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
