import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CashierPageRoutingModule } from './cashier-routing.module';

import { CashierPage } from './cashier.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CashierPageRoutingModule
  ],
  declarations: [CashierPage]
})
export class CashierPageModule {}
