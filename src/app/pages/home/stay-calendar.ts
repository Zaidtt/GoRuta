import {Component,inject,input,output,signal,effect} from '@angular/core';
import {Api} from '../../core/api';
@Component({selector:'stay-calendar',standalone:true,template:`
 <nav><button aria-label="Mes anterior" [disabled]="offset()===0" (click)="offset.set(offset()-1)">‹</button><strong>{{month().toLocaleDateString('es-MX',{month:'long',year:'numeric'})}}</strong><button aria-label="Mes siguiente" (click)="offset.set(offset()+1)">›</button></nav>
 <p>{{pickingEnd()?'Elige la fecha de salida':'Elige la fecha de llegada'}}</p><div class="grid">@for(w of ['L','M','X','J','V','S','D'];track w){<b>{{w}}</b>}
 @for(d of days();track $index){@if(d){<button type="button" [attr.aria-label]="d" [class.selected]="d===start() || d===end()" [class.range]="d>start() && d<end()" [disabled]="disabled(d)" (click)="pick(d)">{{+d.slice(-2)}}</button>}@else{<span></span>}}</div>
 @if(error()){<p role="alert">{{error()}}</p>}
 `,styles:[`:host{display:block;max-width:480px;margin:1rem 0}nav{display:flex;align-items:center;justify-content:space-between}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.grid button,nav button{border:0;border-radius:8px;padding:.55rem;background:#f0f5f6;color:#153640;cursor:pointer}.grid button.selected{background:#086974;color:white}.grid button.range{background:#cbe5e7}.grid button:disabled{color:#8a979c;text-decoration:line-through}.grid b{font-size:.8rem}`]})
export class StayCalendar{
 hotel=input.required<string|number>();start=input('');end=input('');changeDates=output<[string,string]>();
 offset=signal(0);pickingEnd=signal(false);blocked=signal<string[]>([]);ready=signal(false);error=signal('');api=inject(Api);
 iso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 month(){const now=new Date();return new Date(now.getFullYear(),now.getMonth()+this.offset(),1);}
 days(){const m=this.month(),pad=(m.getDay()+6)%7;return [...Array(pad).fill(''),...Array.from({length:new Date(m.getFullYear(),m.getMonth()+1,0).getDate()},(_,i)=>this.iso(new Date(m.getFullYear(),m.getMonth(),i+1)))];}
 constructor(){effect(onCleanup=>{const id=this.hotel(),m=this.month(),from=this.pickingEnd()?this.start():'';this.ready.set(false);const sub=this.api.get<string[]>('goruta/hoteles/'+encodeURIComponent(id)+'/calendario/?mes='+this.iso(m)+'&desde='+encodeURIComponent(from)).subscribe({next:days=>{this.blocked.set(days);this.ready.set(true);this.error.set('');},error:e=>this.error.set(this.api.error(e))});onCleanup(()=>sub.unsubscribe());},{allowSignalWrites:true});}
 disabled(d:string){return !this.ready() || d<this.iso(new Date()) || this.blocked().includes(d) || this.pickingEnd() && d<=this.start();}
 pick(d:string){if(this.pickingEnd()){this.changeDates.emit([this.start(),d]);this.pickingEnd.set(false);}else{this.changeDates.emit([d,'']);this.pickingEnd.set(true);}}
}
