import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  // Selected user role
  selectedRole = signal<'traveler' | 'admin'>('traveler');

  // Form fields
  email = signal('admin@travelbooking.com');
  password = signal('admin123');
  rememberMe = signal(true);
  showPassword = signal(false);

  // States
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(private router: Router) {}

  selectRole(role: 'traveler' | 'admin') {
    this.selectedRole.set(role);
    this.errorMessage.set(null);
    if (role === 'admin') {
      this.email.set('admin@travelbooking.com');
      this.password.set('admin123');
    } else {
      this.email.set('viajero@ejemplo.com');
      this.password.set('viajero123');
    }
  }

  toggleShowPassword() {
    this.showPassword.set(!this.showPassword());
  }

  fillDemo(role: 'traveler' | 'admin') {
    this.selectRole(role);
  }

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const currentEmail = this.email().trim();
    const currentPass = this.password().trim();

    if (!currentEmail || !currentPass) {
      this.errorMessage.set('Por favor completa todos los campos requeridos.');
      return;
    }

    this.isLoading.set(true);

    // Simulate authentication delay for high fidelity UX
    setTimeout(() => {
      this.isLoading.set(false);
      if (this.selectedRole() === 'admin') {
        this.successMessage.set('Credenciales verificadas. Accediendo al Panel de Administración...');
        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 1000);
      } else {
        this.successMessage.set('¡Bienvenido de nuevo! Redirigiendo a tus viajes...');
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000);
      }
    }, 900);
  }
}
