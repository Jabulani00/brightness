import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule
  ],
  exports: [NavbarComponent]
})
export class SharedModule { }
