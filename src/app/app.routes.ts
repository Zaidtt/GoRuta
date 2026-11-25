import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Admin } from './pages/admin/admin';
import { adminGuard } from './core/auth';

import { TravelPage } from './pages/home/travel-page';

const catalogRoutes: Routes = ['vuelos','hoteles','paquetes'].flatMap(kind =>
  ['', '/:codigo'].map(suffix => ({
    path: 'goruta/'+kind+suffix, component: TravelPage, data: {kind}, title: kind[0].toUpperCase()+kind.slice(1)+' | GoRuta'
  }))
);

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
    canActivate: [adminGuard],
    component: Admin,
    title: 'Panel de Administración - TravelBooking'
  },
  ...catalogRoutes,
  {path:'goruta', redirectTo:'goruta/vuelos', pathMatch:'full'},
  {path:'goruta/carrito', component:TravelPage, data:{step:'carrito'}, title:'Mi carrito | GoRuta'},
  {path:'goruta/checkout', component:TravelPage, data:{step:'pago'}, title:'Checkout | GoRuta'},
  {
    path: '**',
    redirectTo: ''
  }
];
