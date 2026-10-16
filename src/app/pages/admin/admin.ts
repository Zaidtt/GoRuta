import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface AdminFlight {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departure: string;
  price: number;
  availableSeats: number;
  status: 'Activo' | 'Lleno' | 'Programado';
}

export interface AdminHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  rating: number;
  status: 'Disponible' | 'Agotado';
}

export interface AdminBooking {
  id: string;
  customerName: string;
  type: 'Vuelo' | 'Hotel' | 'Paquete';
  destination: string;
  date: string;
  amount: number;
  status: 'Confirmada' | 'Pendiente' | 'Cancelada';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
  activeAdminTab = signal<'overview' | 'flights' | 'hotels' | 'bookings' | 'backend'>('overview');

  // Stats
  totalBookings = signal(1284);
  activeFlights = signal(42);
  registeredHotels = signal(89);
  totalRevenue = signal('$284,500');

  // Flights data
  flights = signal<AdminFlight[]>([
    { id: 'FL-101', airline: 'All Nippon Airways', origin: 'Tokyo (HND)', destination: 'Kyoto (ITM)', departure: '2026-11-15 09:30', price: 1500, availableSeats: 14, status: 'Activo' },
    { id: 'FL-204', airline: 'Air France', origin: 'Madrid (MAD)', destination: 'París (CDG)', departure: '2026-11-18 14:15', price: 890, availableSeats: 22, status: 'Activo' },
    { id: 'FL-309', airline: 'Alitalia', origin: 'Barcelona (BCN)', destination: 'Roma (FCO)', departure: '2026-11-20 11:00', price: 740, availableSeats: 8, status: 'Activo' },
    { id: 'FL-415', airline: 'Garuda Indonesia', origin: 'Singapur (SIN)', destination: 'Bali (DPS)', departure: '2026-11-25 16:45', price: 1100, availableSeats: 0, status: 'Lleno' }
  ]);

  // Hotels data
  hotels = signal<AdminHotel[]>([
    { id: 'HT-01', name: 'Bostiava Palace Hotel', city: 'Tokyo', country: 'Japón', pricePerNight: 280, rating: 4.9, status: 'Disponible' },
    { id: 'HT-02', name: 'Qukelad Ryokan & Spa', city: 'Kyoto', country: 'Japón', pricePerNight: 320, rating: 4.8, status: 'Disponible' },
    { id: 'HT-03', name: 'Hôtel Le Parisien Luxury', city: 'París', country: 'Francia', pricePerNight: 410, rating: 4.9, status: 'Disponible' },
    { id: 'HT-04', name: 'Villa Tirta Bali Rainforest', city: 'Ubud', country: 'Indonesia', pricePerNight: 290, rating: 4.9, status: 'Disponible' }
  ]);

  // Bookings data
  bookings = signal<AdminBooking[]>([
    { id: 'BK-9921', customerName: 'Alejandro Morales', type: 'Paquete', destination: 'Tokyo & Kyoto', date: '15/10/2026', amount: 3000, status: 'Confirmada' },
    { id: 'BK-9922', customerName: 'Camila Rodriguez', type: 'Vuelo', destination: 'París, Francia', date: '15/10/2026', amount: 890, status: 'Confirmada' },
    { id: 'BK-9923', customerName: 'Mateo Fernández', type: 'Hotel', destination: 'Bali, Indonesia', date: '14/10/2026', amount: 1450, status: 'Pendiente' },
    { id: 'BK-9924', customerName: 'Sofía Valenzuela', type: 'Vuelo', destination: 'Roma, Italia', date: '14/10/2026', amount: 740, status: 'Confirmada' }
  ]);

  // New item modal simulator
  isModalOpen = signal(false);
  modalType = signal<'flight' | 'hotel'>('flight');

  // Notification message
  adminToast = signal<string | null>(null);

  constructor(private router: Router) {}

  switchTab(tab: 'overview' | 'flights' | 'hotels' | 'bookings' | 'backend') {
    this.activeAdminTab.set(tab);
  }

  logout() {
    this.showAdminToast('Sesión administrativa finalizada.');
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 800);
  }

  openNewModal(type: 'flight' | 'hotel') {
    this.modalType.set(type);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  showAdminToast(msg: string) {
    this.adminToast.set(msg);
    setTimeout(() => {
      if (this.adminToast() === msg) {
        this.adminToast.set(null);
      }
    }, 3000);
  }
}
