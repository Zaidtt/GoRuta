import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';

import { accountGuard, adminGuard } from './core/auth';

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
    title: 'GoRuta - Descubre el Mundo con Experiencias Inolvidables'
  },
  {
    path: 'login',
    component: Login,
    title: 'Iniciar Sesión - GoRuta'
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
    title: 'Panel de Administración - GoRuta'
  },
  {path:'crear-cuenta',loadComponent:()=>import('./pages/login/register').then(m=>m.Register),title:'Crear cuenta | GoRuta'},
  {path:'goruta/configuracion',canActivate:[accountGuard],loadComponent:()=>import('./pages/login/account-settings').then(m=>m.AccountSettings),title:'Mi cuenta | GoRuta'},
  ...catalogRoutes,
  {path:'goruta', redirectTo:'goruta/vuelos', pathMatch:'full'},
  {path:'goruta/carrito', component:TravelPage, data:{step:'carrito'}, title:'Mi carrito | GoRuta'},
  {path:'goruta/checkout', component:TravelPage, data:{step:'pago'}, title:'Checkout | GoRuta'},
  {
    path: '**',
    redirectTo: ''
  }
];
