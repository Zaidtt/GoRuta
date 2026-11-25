import {Component,computed,inject,input,signal,effect} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {Api,Row} from '../../core/api';
import {amenities} from './stay-filters';
@Component({selector:'hotel-guide',standalone:true,imports:[FormsModule],template:`
 <section class="intro">@if(showImage()){<img class="hero" [src]="api.image(h()['image'])" [alt]="h()['name']">}
 <small>{{h()['stayType']}} · {{h()['city']}}, {{h()['country']}}</small><h2>{{h()['name']}}</h2>
 <p>{{h()['description']}}</p>@if(h()['hostName']){<p>♙ {{h()['hostName']}}</p>}<b>★ {{h()['rating']}} / 5 en el catálogo</b> · {{h()['capacity']}} huéspedes · {{h()['baths']}} baño(s)</section>
 <section><h3>Dónde vas a dormir</h3>@if(h()['roomPhoto']){<img class="room" [src]="api.image(h()['roomPhoto'])" alt="Habitación del alojamiento">}<div class="sleep"><span>🛏 {{h()['beds']}} cama(s)</span><span>🚪 {{h()['bedrooms']}} recámara(s)</span></div></section>
 <section><h3>Lo que ofrece este lugar</h3><div class="services">@for(k of included().slice(0,6);track k){<span>{{icons[k]}} {{labels[k]}}</span>}</div>
 <p>🐾 {{h()['petLimit']?'Admite hasta '+h()['petLimit']+' mascota(s)':'Sin admisión de mascotas'}}</p>
 <button type="button" (click)="query='';all.showModal()">Consultar todas las amenidades</button></section>
 <dialog #all><header><h3>Amenidades de {{h()['name']}}</h3><button aria-label="Cerrar" (click)="all.close()">×</button></header>
 <input aria-label="Buscar amenidad" placeholder="Buscar amenidad" [(ngModel)]="query">
 @for(k of keys;track k){@if(labels[k].toLowerCase().includes(query.toLowerCase())){<p>{{icons[k]}} {{labels[k]}} · <b>{{h()[k]?'Disponible':'No incluido'}}</b></p>}}</dialog>
 <section><h3>Evaluaciones de huéspedes</h3>
 @if(feedback();as f){@if(f.reviews.length){<strong>★ {{average()}} · {{f.reviews.length}} evaluación(es)</strong>
 @for(r of f.reviews;track $index){<p>★ {{r.score}} · {{r.comment}}</p>}}@else{<p>Todavía no hay evaluaciones de estancias finalizadas.</p>}
 @if(f.canReview){<label>Puntuación<select [(ngModel)]="score">@for(n of [1,2,3,4,5];track n){<option [ngValue]="n">{{n}}</option>}</select></label><input placeholder="Tu opinión sobre la estancia" aria-label="Tu opinión" maxlength="800" [(ngModel)]="comment"><button [disabled]="!comment.trim()" (click)="post()">Publicar evaluación</button>}}</section>
 @if(message()){<p role="alert">{{message()}}</p>}
 <section><h3>Dónde vas a estar</h3><p>{{h()['city']}}, {{h()['country']}}</p><details><summary>Ver mapa de la ciudad</summary>@defer(on interaction){<iframe [src]="map()" title="Mapa de la ciudad" loading="lazy"></iframe>}@placeholder{<button type="button">Cargar mapa</button>}</details></section>`,
 styles:[`.room{width:min(100%,320px);aspect-ratio:1.6;object-fit:cover;border-radius:12px;margin-bottom:.8rem}section{padding:1.15rem 0;border-bottom:1px solid #cfdee1}h2,h3,p{margin:.35rem 0 .8rem}.hero{width:100%;max-height:340px;object-fit:cover;border-radius:14px}small{color:#167078;font-weight:700}.services,.sleep{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:.75rem}.sleep span{background:#edf4f5;color:#183e49;border-radius:12px;padding:1rem}button{cursor:pointer;padding:.6rem .9rem;border:1px solid #aabec5;background:white;color:#174855;border-radius:10px;font-weight:650}summary{cursor:pointer;color:#11707a}dialog{width:min(450px,90vw);border:0;border-radius:18px;padding:1.4rem;color:#193442;background:white}dialog::backdrop{background:#11203388}header{display:flex;justify-content:space-between;gap:.5rem}input,iframe{width:100%;border:1px solid #bdd0d6;border-radius:10px;padding:.65rem}iframe{height:255px;padding:0}`]})
export class HotelGuide{
 h=input.required<Row>();showImage=input(false);api=inject(Api);private safe=inject(DomSanitizer);
 labels=amenities;keys=Object.keys(amenities);query='';icons:Record<string,string>={wifi:'📶',pool:'🏊',hasBreakfast:'☕',hasFreeCancel:'✓',kitchen:'🍴',parking:'🅿',accessible:'♿',airConditioning:'❄'};
 included=computed(()=>this.keys.filter(k=>this.h()[k]));
 feedback=signal<{reviews:{score:number;comment:string}[];canReview:boolean}|null>(null);message=signal('');score=5;comment='';
 endpoint(){return 'goruta/hoteles/'+encodeURIComponent(this.h().id)+'/opiniones/';}
 constructor(){effect(cleanup=>{this.feedback.set(null);this.message.set('');const sub=this.api.get<NonNullable<ReturnType<typeof this.feedback>>>(this.endpoint()).subscribe({next:r=>this.feedback.set(r),error:e=>this.message.set(this.api.error(e))});cleanup(()=>sub.unsubscribe());},{allowSignalWrites:true});}
 average(){const r=this.feedback()!.reviews;return (r.reduce((sum,v)=>sum+v.score,0)/r.length).toFixed(1);}
 post(){this.api.post<NonNullable<ReturnType<typeof this.feedback>>>(this.endpoint(),{score:this.score,comment:this.comment}).subscribe({next:r=>{this.feedback.set(r);this.comment='';},error:e=>this.message.set(this.api.error(e))});}
 map=computed(()=>this.safe.bypassSecurityTrustResourceUrl('https://maps.google.com/maps?output=embed&q='+encodeURIComponent(this.h()['city']+', '+this.h()['country'])));
}
