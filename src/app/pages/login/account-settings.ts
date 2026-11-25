import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, User } from '../../core/api';
import { Auth } from '../../core/auth';
import { AccountMenu } from '../../core/account-menu';
interface Settings {user:User;phone:string;cards:{brand:string;last4:string}[];points:number}
@Component({standalone:true,imports:[FormsModule,RouterLink,AccountMenu],template:`
 <header><a class="goruta-wordmark" routerLink="/">Go<span>Ruta</span></a><account-menu/></header>
 <main><h1>Configuración de cuenta</h1><p role="status">{{notice()}}</p>
 @if(data();as d){<form #form="ngForm" (ngSubmit)="save(d)">
 <section><h2>Perfil</h2>@if(d.user.avatar){<img [src]="d.user.avatar" alt="Foto de perfil"><button type="button" (click)="d.user.avatar=''">Quitar foto</button>}
 <label>Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" (change)="photo($event,d)"></label>
 <label>Nombre de perfil<input required maxlength="150" name="name" [(ngModel)]="d.user.name"></label>
 <label>Correo electrónico<input required email type="email" name="email" [(ngModel)]="d.user.email"></label>
 @if(d.user.email!==auth.user()?.email){<label>Contraseña actual<input required type="password" autocomplete="current-password" name="password" [(ngModel)]="password"></label>}
 <label>Teléfono<input type="tel" name="phone" pattern="[+0-9 ()\\-]{7,24}" [(ngModel)]="d.phone"></label></section>
 <section><h2>Tarjetas guardadas</h2><p>Guarda una referencia con la marca y los últimos cuatro dígitos.</p>
 @for(c of d.cards;track $index){<p>{{c.brand}} ···· {{c.last4}} <button type="button" (click)="d.cards.splice($index,1)">Quitar</button></p>}
 <div class="card-entry"><select aria-label="Marca" [(ngModel)]="brand" name="brand"><option>Visa</option><option>Mastercard</option></select>
 <input aria-label="Últimos cuatro dígitos" placeholder="Últimos 4 dígitos" inputmode="numeric" maxlength="4" [(ngModel)]="last4" name="last4">
 <button type="button" [disabled]="!digits.test(last4) || d.cards.length>=8" (click)="d.cards.push({brand,last4});last4=''">Agregar</button></div></section>
 <section><h2>Puntos GoRuta · {{d.points}}</h2><p>Recibes 10 puntos por cada reserva confirmada.</p>
 <label>Tema de la página<select name="theme" [(ngModel)]="d.user.theme"><option value="claro">Claro</option><option value="oscuro">Oscuro</option></select></label></section>
 <button class="save" [disabled]="form.invalid || busy()">Guardar cambios</button></form>}
 </main>`,styles:[`header{background:#121826;padding:1rem 6vw;display:flex;justify-content:space-between}main{max-width:740px;margin:auto;padding:1.4rem}section{border:1px solid #b8c9d0;border-radius:16px;background:white;padding:1.3rem;margin:1rem 0}label{display:grid;gap:.3rem;margin:.8rem 0;font-weight:600}input,select,button{padding:.65rem;border-radius:9px;border:1px solid #a8b8c2}button{cursor:pointer}.card-entry{display:flex;gap:.45rem;flex-wrap:wrap}.save{background:#09696e;color:white}img{width:70px;height:70px;border-radius:50%;vertical-align:middle;margin-right:1rem}h2{margin:0;font-size:1.15rem}`]})
export class AccountSettings{
 api=inject(Api);auth=inject(Auth);data=signal<Settings|null>(null);notice=signal('');busy=signal(false);
 password='';brand='Visa';last4='';digits=/^\d{4}$/;
 constructor(){this.api.get<Settings>('account/settings/').subscribe({next:d=>this.data.set(d),error:e=>this.notice.set(this.api.error(e))});}
 async photo(event:Event,d:Settings){
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
  this.busy.set(true);
  try{if(file.size>8000000)throw Error();const bitmap=await createImageBitmap(file);const size=Math.min(bitmap.width,bitmap.height);
   const c=document.createElement('canvas');c.width=c.height=180;c.getContext('2d')!.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,180,180);bitmap.close();d.user.avatar=c.toDataURL('image/jpeg',.82);
  }catch{this.notice.set('Elige una imagen de hasta 8 MB.');}finally{this.busy.set(false);}
 }
 save(d:Settings){if(this.busy())return;this.busy.set(true);
 this.api.updateSettings<Settings>({...d.user,phone:d.phone,cards:d.cards,password:this.password}).subscribe({next:r=>{this.data.set(r);this.auth.sync(r.user);this.password='';this.notice.set('Cambios guardados.');this.busy.set(false);},error:e=>{this.notice.set(this.api.error(e));this.busy.set(false);}});}
}
