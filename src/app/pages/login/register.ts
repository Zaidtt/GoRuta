import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';

@Component({
  standalone: true, imports: [FormsModule, RouterLink],
  templateUrl:'./register.html',styleUrl:'./login.scss'
})
export class Register {
  private api=inject(Api);
  private route=inject(ActivatedRoute);
  name='';email='';password='';confirmation='';
  busy=signal(false);created=signal(false);error=signal('');
  loginParams(){return {volver:this.route.snapshot.queryParamMap.get('volver'),correo:this.created()?this.email:null};}
  register(){
    if(this.busy() || this.password!==this.confirmation)return;
    this.busy.set(true);this.error.set('');
    this.api.post('auth/register/',{name:this.name.trim(),email:this.email.trim(),password:this.password}).subscribe({
      next:()=>{this.password='';this.confirmation='';this.created.set(true);this.busy.set(false);},
      error:e=>{this.error.set(this.api.error(e));this.busy.set(false);}
    });
  }
}
