import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import { Api, Row } from '../../core/api';
import { Auth } from '../../core/auth';

@Component({ selector: 'app-catalog', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html', styleUrl: './catalog.scss' })
export class Catalog {
  api = inject(Api); auth = inject(Auth); private router = inject(Router);
  kind = input<'vuelos' | 'hoteles' | 'paquetes'>('vuelos'); query = input('');
  kindChange = output<'vuelos' | 'hoteles' | 'paquetes'>();
  categories: ('vuelos' | 'hoteles' | 'paquetes')[] = ['vuelos', 'hoteles', 'paquetes'];
  offers = signal<Record<string, Row[]>>({ vuelos: [], hoteles: [], paquetes: [] });
  bookings = signal<Row[]>([]); loading = signal(false); busy = signal(false); error = signal(''); notice = signal('');
  search = signal(''); selected = signal<Row | null>(null); travelers = 1; checkIn = ''; checkOut = '';
  morning=input(false); baggage=input(false);
  limit=input(2500); direct=input(false); stars=input(0); breakfast=input(false); freeCancel=input(false); wifi=input(false); pool=input(false); region=input('todos'); destinations=input<any[]>([]);
  rows = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    return this.offers()[this.kind()].filter(row => {
      const published = row['isPublished'] !== false && row['active'] !== false;
      const text = [row['name'], row['origin'], row['destinationDetails']?.title, row['destination'], row['city'], row['country'], row['airline']].join(' ').toLocaleLowerCase();
      const hotel = row['hotelDetails'] || row, flight=row['flightDetails'] || row;
      const kind=this.kind();
      const destination=row['destinationDetails'] || this.destinations().find(d=>d.id===row['destinationRef'] || d.title===row['city'] || String(row['destination']).startsWith(d.title+' ('));
      if(this.region()!=='todos' && destination?.region!==this.region())return false;
      if(this.limit()<2500 && Number(row['price'] ?? row['pricePerNight'])>this.limit())return false;
      if(kind!=='hoteles' && (this.baggage()&&!flight['carryOn'] || this.morning() && new Date(flight['departure']).getHours()>=12))return false;
      if(kind!=='hoteles' && this.direct() && !flight['direct'])return false;
      if(kind!=='vuelos' && (hotel['stars']<this.stars() || this.breakfast()&&!hotel['hasBreakfast'] || this.freeCancel()&&!hotel['hasFreeCancel'] || this.wifi()&&!hotel['wifi'] || this.pool()&&!hotel['pool']))return false;
      return published && (!q || text.includes(q));
    });
  });
  constructor() {
    effect(() => this.search.set(this.query()), { allowSignalWrites: true });
    effect(() => { if (this.auth.user()) this.loadBookings(); else this.bookings.set([]); });
    try {this.cart.set(JSON.parse(sessionStorage.getItem(this.cartKey()) || '[]'));} catch {this.cart.set([]);}
    this.reload();
  }
  reload() {
    this.loading.set(true); this.error.set('');
    forkJoin({ vuelos: this.api.all('flights'), hoteles: this.api.all('hotels'), paquetes: this.api.all('packages') }).subscribe({
      next: offers => { this.offers.set(offers); this.loading.set(false); },
      error: error => { this.error.set(this.api.error(error)); this.loading.set(false); }
    });
  }
  loadBookings() { this.api.all('bookings').subscribe({ next: rows => this.bookings.set(rows), error: error => this.error.set(this.api.error(error)) }); }
  title(row: Row) { return row['name'] || `${row['origin']} → ${row['destination']}`; }
  photo(row: Row) { return this.api.image(row['image'] || row['destinationDetails']?.image); }
  unavailable(row: Row) { return row['status'] === 'Agotado' || row['status'] === 'Lleno'
    || (this.kind() === 'vuelos' && (row['availableSeats'] < 1 || new Date(row['departure']) <= new Date()))
    || (this.kind() === 'paquetes' && (row['flightDetails']?.availableSeats < 1 || row['hotelDetails']?.status === 'Agotado' || new Date(row['flightDetails']?.departure) <= new Date())); }
  step = signal('');
  cart = signal<any[]>([]);
  names = ['']; chosenHotel = ''; chosenFlight = ''; seatList = signal<string[]>([]); freeSeats = signal<string[]>([]); picked = signal<string[]>([]);
  method = 'Visa'; receipt = signal<any[]>([]);
  cartKey() { return 'goruta.cart.' + this.auth.user()?.id; }
  persist(items:any[]) { this.cart.set(items); sessionStorage.setItem(this.cartKey(), JSON.stringify(items)); }
  roundTrip = true;
  returnId = '';
  returnSeats = false;
  outboundSeats: string[] = [];
  airlines: Record<string,string> = {'Volaris':'Y4','Viva Aerobus':'VB','Aeroméxico':'AM','Air France':'AF','All Nippon Airways':'NH','Alitalia':'AZ','Garuda Indonesia':'GA'};
  logo(row:Row) { const code=this.airlines[row['airline']]; return code ? '/images/catalog/'+code+'.png' : ''; }
  flight(id:string) { return this.offers()['vuelos'].find(f=>f.id===id); }
  returns() {
    const out=this.flight(this.chosenFlight);
    if(!out) return [];
    const airport=(v:string)=> (v.match(/\(([A-Z]{3})\)\s*$/)?.[1] || v.trim()).toUpperCase();
    return this.offers()['vuelos'].filter(f=>f['isPublished'] && !this.unavailableFlight(f)
      && airport(f['origin'])===airport(out['destination']) && airport(f['destination'])===airport(out['origin'])
      && Date.parse(f['departure'])>Date.parse(out['departure'])
      && (this.kind()!=='paquetes' || f['departure'].slice(0,10)>=this.checkOut))
      .sort((a,b)=>Date.parse(a['departure'])-Date.parse(b['departure']));
  }
  unavailableFlight(f:Row) { return !f['availableSeats'] || f['status']==='Lleno' || Date.parse(f['departure'])<=Date.now(); }
  itineraryNext() {
    this.returnId=''; this.error.set('');
    this.step.set(this.roundTrip?'regreso':'pasajeros');
  }
  open(row:Row) {
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.returnId=''; this.returnSeats=false; this.outboundSeats=[];
    this.selected.set(row); this.error.set(''); this.names=['']; this.picked.set([]);
    this.chosenFlight=String(row['flight'] ?? row.id); this.chosenHotel=String(row['hotel'] ?? row.id);
    const departure=row['flightDetails']?.departure || row['departure'];
    this.checkIn=(departure || new Date(Date.now()+86400000).toISOString()).slice(0,10);
    this.checkOut=new Date(Date.parse(this.checkIn)+(row['nights'] || 1)*86400000).toISOString().slice(0,10);
    this.step.set(this.kind()==='paquetes'?'hotel':this.kind()==='vuelos' && this.roundTrip?'regreso':'pasajeros');
  }
  options(kind:string) { const row=this.selected()!; return this.offers()[kind].filter(x=>(x.id===row[kind==='hoteles'?'hotel':'flight'] || x['destinationRef']===row['destination']) && x['isPublished'] && x['status']!=='Agotado' && x['status']!=='Lleno' && (!x['departure'] || Date.parse(x['departure'])>Date.now())); }
  selectFlight(id:string) { this.chosenFlight=id; const f=this.offers()['vuelos'].find(x=>x.id===id); if(f){this.checkIn=f['departure'].slice(0,10);this.checkOut=new Date(Date.parse(this.checkIn)+this.selected()!['nights']*86400000).toISOString().slice(0,10);} }
  async next() {
    if(this.names.some(n=>n.trim().length<2)){this.error.set('Completa el nombre de cada pasajero.');return;}
    this.error.set('');
    if(this.kind()!=='vuelos' && (!(this.checkOut>this.checkIn) || (this.kind()==='paquetes' && this.nights()!==this.selected()!['nights']))){this.error.set('Revisa las fechas y las noches de estancia.');return;}
    if(this.kind()==='hoteles'){this.add();return;}
    await this.loadSeats(this.chosenFlight,false);
  }
  async loadSeats(id:string, returning:boolean) {
    if(this.busy())return;
    this.busy.set(true);
    try { const info=await firstValueFrom(this.api.get<{layout:string[];available:string[]}>('flights/'+encodeURIComponent(id)+'/seats/'));if(info.available.length<this.names.length){this.error.set('Este tramo ya no tiene suficientes asientos.');return;}
      this.returnSeats=returning;this.picked.set([]);this.seatList.set(info.layout);this.freeSeats.set(info.available);this.step.set('asientos'); }
    catch(e){this.error.set(this.api.error(e));}finally{this.busy.set(false);}
  }
  async finishSeats(){
    if(this.returnId && !this.returnSeats){this.outboundSeats=[...this.picked()];await this.loadSeats(this.returnId,true);return;}
    this.add();
  }
  toggle(s:string){this.picked.update(v=>v.includes(s)?v.filter(x=>x!==s):v.length<this.names.length?[...v,s]:v);}
  nights(){return (Date.parse(this.checkOut)-Date.parse(this.checkIn))/86400000;}
  add(){
    const row=this.selected()!, kind=this.kind(), key=kind==='vuelos'?'flight':kind==='hoteles'?'hotel':'package';
    const item:any={type:kind==='vuelos'?'Vuelo':kind==='hoteles'?'Hotel':'Paquete',[key]:row.id,passengers:[...this.names],seats:this.returnSeats?[...this.outboundSeats]:[...this.picked()]};
    if(kind!=='vuelos')Object.assign(item,{checkIn:this.checkIn,checkOut:this.checkOut});
    if(kind==='paquetes')Object.assign(item,{chosenHotel:this.chosenHotel,chosenFlight:this.chosenFlight});
    const amount=kind==='hoteles'?Number(row['pricePerNight'])*this.nights():Number(row['price'])*this.names.length;
    const inbound=this.flight(this.returnId);
    const out=this.flight(this.chosenFlight);
    const group=inbound ? crypto.randomUUID() : undefined;
    const entries:any[]=[{title:this.title(row),amount,item,group}];
    if(inbound && out){
      entries[0].title=(kind==='paquetes'?this.title(row)+' · ':'')+'Ida · '+this.legTitle(out);
      entries.push({title:'Regreso · '+this.legTitle(inbound), group, amount:Number(inbound['price'])*this.names.length,
        item:{type:'Vuelo',flight:inbound.id,passengers:[...this.names],seats:[...this.picked()]}});
    }
    this.persist([...this.cart(),...entries]);this.selected.set(null);this.step.set('carrito');
  }
  legTitle(f:Row){return this.title(f)+' · '+f['airline']+' · '+new Date(f['departure']).toLocaleString('es-MX');}
  remove(i:number){const group=this.cart()[i].group;this.persist(this.cart().filter((x,idx)=>group?x.group!==group:idx!==i));}
  total(){return this.cart().reduce((n,x)=>n+x.amount,0);}
  base(){return this.cart().reduce((n,x)=>n+Math.round(x.amount/1.16*100)/100,0);}
  async pay(){
    if(this.busy() || !this.cart().length)return;
    this.busy.set(true);this.error.set('');
    try{const result=await firstValueFrom(this.api.post<any[]>('checkout/',{payment:this.method,items:this.cart().map(x=>x.item)}));this.receipt.set(result);this.persist([]);this.step.set('confirmado');this.reload();this.loadBookings();}
    catch(e){this.error.set(this.api.error(e));}finally{this.busy.set(false);}
  }

  async cancel(row: Row) {
    if (this.busy()) return; this.busy.set(true);
    try { await firstValueFrom(this.api.post(`bookings/${row.id}/cancel/`, {})); this.loadBookings(); this.reload(); }
    catch (error) { this.error.set(this.api.error(error)); }
    finally { this.busy.set(false); }
  }
}
