import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Admin } from './pages/admin/admin';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'TravelBooking - Descubre el Mundo con Experiencias Inolvidables'
  },
  {
    path: 'login',
    component: Login,
    title: 'Iniciar Sesión - TravelBooking'
  },
  {
    path: 'admin',
    component: Admin,
    title: 'Panel de Administración - TravelBooking'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
