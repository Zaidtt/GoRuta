import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/auth';
import { Api } from '../../core/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private api = inject(Api);
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

    this.auth.login(currentEmail, this.password(), this.rememberMe()).subscribe({
      next: session => {
        this.isLoading.set(false);
        const next=this.route.snapshot.queryParamMap.get('volver');
        this.router.navigateByUrl(next?.startsWith('/goruta/') ? next : session.user.role==='admin'?'/admin':'/');
      },
      error: error => { this.isLoading.set(false); this.errorMessage.set(this.api.error(error)); }
    });
  }
}
