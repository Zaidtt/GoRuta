import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from './auth';
@Component({selector:'account-menu',standalone:true,imports:[RouterLink],template:`
  @if(auth.user();as u){<details><summary>@if(u.avatar){<img [src]="u.avatar" alt="">}{{u.name || u.email}} ▾</summary>
  <div><a routerLink="/goruta/configuracion">Configuración</a><button (click)="logout()">Cerrar sesión</button>@if(error()){<small role="alert">{{error()}}</small>}</div></details>}
  @else{<a class="enter" routerLink="/login" [queryParams]="{volver:router.url}">Iniciar sesión</a>}`,
 styles:[`:host{position:relative;z-index:20}summary,.enter{cursor:pointer;display:flex;align-items:center;gap:.45rem;color:white;border:1px solid #83929d;border-radius:24px;padding:.48rem .85rem;font-weight:650;text-decoration:none}img{width:28px;height:28px;border-radius:50%}details div{position:absolute;right:0;top:calc(100% + 5px);min-width:155px;background:#fff;color:#1b3444;border:1px solid #c6d5da;border-radius:10px;padding:.4rem;box-shadow:0 8px 24px #18283033}details a,button{display:block;text-align:left;color:#173d49;background:white;border:0;padding:.6rem;font:inherit;text-decoration:none;width:100%}`]})
export class AccountMenu{
 auth=inject(Auth);router=inject(Router);error=signal('');
 logout(){this.auth.logout().subscribe({next:()=>this.router.navigateByUrl('/'),error:e=>{if(e.status===401){this.auth.clear();this.router.navigateByUrl('/');}else this.error.set('No se pudo cerrar la sesión. Reintenta.');}});}
}
