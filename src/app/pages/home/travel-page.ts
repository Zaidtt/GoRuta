import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Catalog } from './catalog';

@Component({
  standalone: true,
  imports: [Catalog, RouterLink],
  template: `
    <header><nav aria-label="Navegación principal">
      <a class="wordmark" routerLink="/" aria-label="GoRuta, inicio">Go<span>Ruta</span></a>
      <div><a routerLink="/goruta/vuelos">Vuelos</a><a routerLink="/goruta/hoteles">Hoteles</a><a routerLink="/goruta/paquetes">Paquetes</a></div>
      <a class="cart" routerLink="/goruta/carrito">Mi carrito</a>
    </nav></header>
    <main>@for (key of [router.url]; track key) {
      <app-catalog [standalonePage]="true" [kind]="route.snapshot.data['kind'] || 'vuelos'"
        [recordCode]="route.snapshot.paramMap.get('codigo') || ''"
        [initialStep]="route.snapshot.data['step'] || ''"
        (kindChange)="router.navigate(['/goruta',$event])" />
    }</main>`,
  styles: [`
    :host{display:block;min-height:100vh;background:#f5f7fa}
    header{background:var(--color-navy-dark);color:white;border-bottom:3px solid var(--color-teal)}
    nav,main{max-width:1240px;margin:auto;padding:0 clamp(16px,4vw,54px)}
    nav,nav div{display:flex;align-items:center;gap:clamp(10px,3vw,36px)}
    nav{min-height:72px;justify-content:space-between}nav a{color:white;text-decoration:none;font-weight:600}
    .wordmark{font:800 1.9rem var(--font-heading);letter-spacing:-.07em}.wordmark span{color:#ff876e}
    .cart{border:1px solid #637080;padding:.45rem .8rem;border-radius:99px}
    @media(max-width:570px){nav{flex-wrap:wrap;gap:.25rem;padding-block:.5rem}nav div{order:3;width:100%;justify-content:space-around}nav div a{padding:.25rem}}
  `]
})
export class TravelPage {
  route = inject(ActivatedRoute);
  router = inject(Router);
}
