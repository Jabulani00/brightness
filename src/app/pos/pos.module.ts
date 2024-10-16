import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { POSPageRoutingModule } from './pos-routing.module';

import { POSPage } from './pos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    POSPageRoutingModule
  ],
  declarations: [POSPage]
})
export class POSPageModule {}
