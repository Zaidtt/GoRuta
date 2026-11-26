import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { HotelGuide } from './hotel-guide';
import { StayCalendar } from './stay-calendar';
import { newStay, Stay, StayFilters } from './stay-filters';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import { Api, Row } from '../../core/api';
import { Auth } from '../../core/auth';

@Component({ selector: 'app-catalog', standalone: true, imports: [HotelGuide,StayCalendar,StayFilters, CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html', styleUrl: './catalog.scss' })
export class Catalog {
  api = inject(Api); auth = inject(Auth); router = inject(Router);
  kind = input<'vuelos' | 'hoteles' | 'paquetes'>('vuelos'); query = input('');
  clearFilters = output<void>();
  kindChange = output<'vuelos' | 'hoteles' | 'paquetes'>();
  route = inject(ActivatedRoute);
  standalonePage = input(false);
  recordCode = input('');
  initialStep = input('');
  categories: ('vuelos' | 'hoteles' | 'paquetes')[] = ['vuelos', 'hoteles', 'paquetes'];
  offers = signal<Record<string, Row[]>>({ vuelos: [], hoteles: [], paquetes: [] });
  bookings = signal<Row[]>([]); loading = signal(false); busy = signal(false); error = signal(''); notice = signal('');
  search = signal(''); selected = signal<Row | null>(null); travelers = 1; checkIn = ''; checkOut = '';
  extraServices=input<string[]>([]);
  morning=input(false); baggage=input(false);
  limit=input(2500); direct=input(false); stars=input(0); breakfast=input(false); freeCancel=input(false); wifi=input(false); pool=input(false); region=input('todos'); destinations=input<any[]>([]);
  blankStay=newStay;
  stay=signal<Stay>(newStay());
  availableHotels=signal<string[]|null>(null);
  async applyStay(s:Stay){
    this.stay.set(s);this.error.set('');this.availableHotels.set(s.check_in?[]:null);
    sessionStorage.setItem('goruta.stayFilters',JSON.stringify(s));
    if(s.check_in){try{
      const ids=await firstValueFrom(this.api.get<string[]>('goruta/disponibilidad/?'+new URLSearchParams({check_in:s.check_in,check_out:s.check_out})));
      if(this.stay()===s)this.availableHotels.set(ids);
    }catch(e){if(this.stay()===s)this.error.set(this.api.error(e));}}
  }
  stayNights(){const s=this.stay();return (Date.parse(s.check_out)-Date.parse(s.check_in))/86400000;}
  rows = computed(() => {
    const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    const q = normalize(this.search().trim());
    return this.offers()[this.kind()].filter(row => {
      const published = row['isPublished'] !== false && row['active'] !== false;
      const hotel = row['hotelDetails'] || row, flight=row['flightDetails'] || row;
      const kind=this.kind();
      const destination=row['destinationDetails'] || this.destinations().find(d=>d.id===row['destinationRef'] || d.title===row['city'] || String(row['destination']).startsWith(d.title+' ('));
      const text=normalize([row['name'],flight['origin'],flight['destination'],flight['airline'],hotel['name'],hotel['city'],hotel['country'],destination?.title,destination?.country].join(' '));
      if(this.region()!=='todos' && destination?.region!==this.region())return false;
      if(this.limit()<2500 && Number(row['price'] ?? row['pricePerNight'])>this.limit())return false;
      if(kind!=='hoteles' && (this.baggage()&&!flight['carryOn'] || this.morning() && new Date(flight['departure']).getHours()>=12))return false;
      if(kind!=='hoteles' && this.direct() && !flight['direct'])return false;
      if(kind!=='vuelos' && (Number(hotel['rating'] || 0)<this.stars() || this.breakfast()&&!hotel['hasBreakfast'] || this.freeCancel()&&!hotel['hasFreeCancel'] || this.wifi()&&!hotel['wifi'] || this.pool()&&!hotel['pool']))return false;
      if(kind!=='vuelos' && this.extraServices().some(k=>!hotel[k]))return false;
      if(kind==='hoteles'){
        const s=this.stay(),cost=Number(row['pricePerNight']),ids=this.availableHotels();
        if(row['status']==='Agotado' || ids && !ids.includes(String(row.id)) || row['capacity']<s.adults+s.children+s.infants || row['petLimit']<s.pets ||
          cost<s.min || s.max && cost>s.max || s.type && row['stayType']!==s.type || row['beds']<s.beds || row['bedrooms']<s.bedrooms || row['baths']<s.baths || s.amenities.some(k=>!row[k]))return false;
      }
      return published && (!q || text.includes(q));
    }).sort((a,b)=>{if(this.kind()!=='hoteles')return 0;switch(this.stay().order){case 'low':return a['pricePerNight']-b['pricePerNight'];case 'high':return b['pricePerNight']-a['pricePerNight'];case 'rating':return b['rating']-a['rating'];default:return 0;}});
  });
  constructor() {
    effect(() => this.search.set(this.query()), { allowSignalWrites: true });
    effect(() => { if (this.auth.user()) this.loadBookings(); else this.bookings.set([]); });
    try {this.cart.set(JSON.parse(sessionStorage.getItem(this.cartKey()) || '[]'));} catch {this.cart.set([]);}
  }
  ngOnInit(){
    if(!this.recordCode() && !this.initialStep()){
      try{const saved=JSON.parse(sessionStorage.getItem('goruta.stayFilters') || 'null');if(saved && (!saved.check_in || saved.check_in>=new Date().toLocaleDateString('en-CA')))this.applyStay({...newStay(),...saved});}catch{}
    }
    if(this.standalonePage()) window.scrollTo({top:0,behavior:'instant'});
    if(this.initialStep()){this.step.set(this.initialStep());return;}
    this.reload();
  }
  reload() {
    this.loading.set(true); this.error.set('');
    if(this.recordCode()){
      const category=this.kind();
      const extras:Record<string,ReturnType<Api['all']>>={};
      if(category!=='hoteles') extras['vuelos']=this.api.all('goruta/vuelos');
      if(category==='paquetes') extras['hoteles']=this.api.all('goruta/hoteles');
      forkJoin({detail:this.api.get<Row>('goruta/'+category+'/'+encodeURIComponent(this.recordCode())+'/'),...extras}).subscribe({
        next: result=>{
          const data=result as Record<string,any>;
          this.offers.set({vuelos:data['vuelos']||[],hoteles:data['hoteles']||[],paquetes:[]});
          this.roundTrip=this.route.snapshot.queryParamMap.get('viaje')!=='ida';
          this.initialize(data['detail']);
          this.resumeAfterLogin();
          this.loading.set(false);
        },
        error:e=>{this.error.set(e.status===404?'Esta oferta ya no está disponible.':this.api.error(e));this.loading.set(false);}
      });
      return;
    }
    let refreshed = false;
    this.api.preview.subscribe({ next: data => {
      if (!refreshed && !this.offers()['vuelos'].length) {
        this.offers.set({ vuelos: data['vuelos'], hoteles: data['hoteles'], paquetes: data['paquetes'] });
      }
    }, error: () => {} });
    forkJoin({ vuelos: this.api.all('flights'), hoteles: this.api.all('hotels'), paquetes: this.api.all('packages') }).subscribe({
      next: offers => { refreshed = true; this.offers.set(offers); this.loading.set(false); },
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
  cabinZone = 0;
  zones = ['Delantera','Central','Trasera'];
  zoneSize(){return Math.ceil(this.seatList().length/18)*6;}
  zoneSeats(zone:number){return this.seatList().slice(zone*this.zoneSize(),(zone+1)*this.zoneSize());}
  holder='';cardNumber='';expiry='';cvc='';
  demoNumber(){return this.method==='Visa'?'4111111111111111':'5555555555554444';}
  chooseMethod(method:string){
    if(method!==this.method){this.method=method;this.cardNumber='';this.cvc='';}
  }
  fillDemo(){this.holder='Viajero GoRuta';this.cardNumber=this.demoNumber();this.expiry='12/'+String(new Date().getFullYear()+3).slice(-2);this.cvc='123';}
  validExpiry(){
    if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.expiry))return false;
    const [month,year]=this.expiry.split('/').map(Number);
    return new Date(2000+year,month,1).getTime()>Date.now();
  }
  carrierFor(entry:any){return entry.carrier || Object.keys(this.airlines).find(name=>entry.title.split(' · ').includes(name)) || '';}
  method = 'Visa'; receipt = signal<any[]>([]);
  cartKey() { return 'goruta.cart.' + this.auth.user()?.id; }
  persist(items:any[]) { this.cart.set(items); sessionStorage.setItem(this.cartKey(), JSON.stringify(items)); }
  roundTrip = true;
  returnId = '';
  returnSeats = false;
  outboundSeats: string[] = [];
  airlines: Record<string,string> = {'Volaris':'Y4','Viva Aerobus':'VB','Aeroméxico':'AM','Air France':'AF','All Nippon Airways':'NH','Alitalia':'AZ','Garuda Indonesia':'GA'};
  logo(row:Row) { const code=this.airlines[row['airline']]; return code ? 'images/catalog/'+code+'.png' : ''; }
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
    this.router.navigate(['/goruta',this.kind(),row.id],{queryParams:this.kind()==='hoteles'?{check_in:this.stay().check_in||null,check_out:this.stay().check_out||null,adults:this.stay().adults,children:this.stay().children,infants:this.stay().infants,pets:this.stay().pets}:this.roundTrip?{}:{viaje:'ida'}});
  }
  requireLogin(){
    if(this.auth.user()) return true;
    if(this.selected()){
      sessionStorage.setItem('goruta.loginDraft',JSON.stringify({url:this.router.url,hotel:this.chosenHotel,
        flight:this.chosenFlight,back:this.returnId,checkIn:this.checkIn,checkOut:this.checkOut}));
    }
    this.router.navigate(['/login'],{queryParams:{volver:this.router.url}});
    return false;
  }
  resumeAfterLogin(){
    const raw=sessionStorage.getItem('goruta.loginDraft');
    if(!raw || !this.auth.user())return;
    sessionStorage.removeItem('goruta.loginDraft');
    try {
      const draft=JSON.parse(raw);
      if(draft.url!==this.router.url)return;
      if(this.kind()==='paquetes'){
        if(!this.options('hoteles').some(h=>h.id===draft.hotel) || !this.options('vuelos').some(f=>f.id===draft.flight))return;
        this.chosenHotel=draft.hotel;this.selectFlight(draft.flight);
      }
      this.checkIn=draft.checkIn;this.checkOut=draft.checkOut;
      if(this.kind()!=='hoteles' && this.roundTrip){
        if(!this.returns().some(f=>f.id===draft.back))return;
        this.returnId=draft.back;
      }
      this.step.set('pasajeros');
    } catch {return;}
  }
  initialize(row:Row){
    this.returnId=''; this.returnSeats=false; this.outboundSeats=[];
    this.selected.set(row); this.error.set(''); this.names=['']; this.picked.set([]);
    this.chosenFlight=String(row['flight'] ?? row.id); this.chosenHotel=String(row['hotel'] ?? row.id);
    const departure=row['flightDetails']?.departure || row['departure'];
    this.checkIn=(departure || new Date(Date.now()+86400000).toISOString()).slice(0,10);
    this.checkOut=new Date(Date.parse(this.checkIn)+(row['nights'] || 1)*86400000).toISOString().slice(0,10);
    if(this.kind()==='hoteles'){
      const q=this.route.snapshot.queryParamMap;
      const people=['adults','children','infants'].reduce((n,k)=>n+Math.max(0,Number(q.get(k))||0),0);
      this.names=Array(Math.max(1,Math.min(20,Math.floor(people)))).fill('');
      if(q.get('check_in') && q.get('check_out')){this.checkIn=q.get('check_in')!;this.checkOut=q.get('check_out')!;}
    }
    this.step.set(this.kind()==='hoteles'?'estancia':this.kind()==='paquetes'?'hotel':this.kind()==='vuelos' && this.roundTrip?'regreso':'pasajeros');
  }
  options(kind:string) { const row=this.selected()!; return this.offers()[kind].filter(x=>(x.id===row[kind==='hoteles'?'hotel':'flight'] || x['destinationRef']===row['destination']) && x['isPublished'] && x['status']!=='Agotado' && x['status']!=='Lleno' && (!x['departure'] || Date.parse(x['departure'])>Date.now())); }
  selectFlight(id:string) { this.chosenFlight=id; const f=this.offers()['vuelos'].find(x=>x.id===id); if(f){this.checkIn=f['departure'].slice(0,10);this.checkOut=new Date(Date.parse(this.checkIn)+this.selected()!['nights']*86400000).toISOString().slice(0,10);} }
  async next() {
    if(!this.requireLogin())return;
    if(this.names.some(n=>n.trim().length<2)){this.error.set('Completa el nombre de cada pasajero.');return;}
    this.error.set('');
    if(this.kind()!=='vuelos' && (!(this.checkOut>this.checkIn) || (this.kind()==='paquetes' && this.nights()!==this.selected()!['nights']))){this.error.set('Revisa las fechas y las noches de estancia.');return;}
    if(this.kind()==='hoteles'){this.add();return;}
    await this.loadSeats(this.chosenFlight,false);
  }
  async loadSeats(id:string, returning:boolean) {
    if(this.busy())return;
    this.busy.set(true);
    try { const info=await firstValueFrom(this.api.get<{layout:string[];available:string[]}>('goruta/vuelos/'+encodeURIComponent(id)+'/asientos/'));if(info.available.length<this.names.length){this.error.set('Este tramo ya no tiene suficientes asientos.');return;}
      this.cabinZone=0;this.returnSeats=returning;this.picked.set([]);this.seatList.set(info.layout);this.freeSeats.set(info.available);this.step.set('asientos'); }
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
    if(kind==='hoteles'){
      const q=this.route.snapshot.queryParamMap;
      const children=Number(q.get('children')||0),infants=Number(q.get('infants')||0);
      if(this.names.length<=children+infants){this.error.set('La reserva requiere al menos un adulto.');return;}
      item.guests={adults:this.names.length-children-infants,children,infants,pets:Number(q.get('pets')||0)};
    }
    if(kind!=='vuelos')Object.assign(item,{checkIn:this.checkIn,checkOut:this.checkOut});
    if(kind==='paquetes')Object.assign(item,{chosenHotel:this.chosenHotel,chosenFlight:this.chosenFlight});
    const amount=kind==='hoteles'?Number(row['pricePerNight'])*this.nights():Number(row['price'])*this.names.length;
    const inbound=this.flight(this.returnId);
    const out=this.flight(this.chosenFlight);
    const group=inbound ? crypto.randomUUID() : undefined;
    const entries:any[]=[{title:this.title(row),amount,item,group}];
    if(out && kind!=='hoteles')Object.assign(entries[0],{carrier:out['airline'],direction:kind==='paquetes'?'Paquete · Ida':'Ida',
      route:(kind==='paquetes'?this.title(row)+' · ':'')+this.title(out),departure:out['departure']});
    if(inbound && out){
      entries[0].title=(kind==='paquetes'?this.title(row)+' · ':'')+'Ida · '+this.legTitle(out);
      entries.push({direction:'Regreso',carrier:inbound['airline'],route:this.title(inbound),departure:inbound['departure'],title:'Regreso · '+this.legTitle(inbound), group, amount:Number(inbound['price'])*this.names.length,
        item:{type:'Vuelo',flight:inbound.id,passengers:[...this.names],seats:[...this.picked()]}});
    }
    this.persist([...this.cart(),...entries]);this.router.navigate(['/goruta/carrito']);
  }
  legTitle(f:Row){return this.title(f)+' · '+f['airline']+' · '+new Date(f['departure']).toLocaleString('es-MX');}
  remove(i:number){const group=this.cart()[i].group;this.persist(this.cart().filter((x,idx)=>group?x.group!==group:idx!==i));}
  total(){return this.cart().reduce((n,x)=>n+x.amount,0);}
  base(){return this.cart().reduce((n,x)=>n+Math.round(x.amount/1.16*100)/100,0);}
  async pay(){
    if(this.busy() || !this.cart().length || !this.requireLogin())return;
    this.busy.set(true);this.error.set('');
    try{const result=await firstValueFrom(this.api.post<any[]>('checkout/',{payment:this.method,items:this.cart().map(x=>x.item)}));this.holder=this.cardNumber=this.expiry=this.cvc='';this.receipt.set(result);this.persist([]);this.step.set('confirmado');}
    catch(e){this.error.set(this.api.error(e));}finally{this.busy.set(false);}
  }

  async cancel(row: Row) {
    if (this.busy()) return; this.busy.set(true);
    try { await firstValueFrom(this.api.post(`bookings/${row.id}/cancel/`, {})); this.loadBookings(); this.reload(); }
    catch (error) { this.error.set(this.api.error(error)); }
    finally { this.busy.set(false); }
  }
}
