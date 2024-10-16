import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shipping-method',
  templateUrl: './shipping-method.page.html',
  styleUrls: ['./shipping-method.page.scss'],
})

export class ShippingMethodPage implements OnInit {
  [x: string]: any;
  selectedShippingMethod = 'standard';
  shippingCost = 13.92;
  shippingMethod!: string;

  constructor(private router: Router) { }
  onContinue() {
    // Navigate to the shipping address page
    this.router.navigate(['/pages/checkout/shipping-address']);
  }
  onShippingMethodChange(method: string) {
    this.selectedShippingMethod = method;
    this['updateShippingCost']();
  }
  
  private updateShippingCost() {
    this.shippingCost = this.selectedShippingMethod === 'standard' ? 13.92 : 26.92;
  }
  
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  selectShippingMethod(method: string) {
    this.shippingMethod = method;
     // Store the shipping method in a service or local storage
     this.router.navigate(['/checkout/shipping-address']);
    }
  }

  
function ngOnInit() {
  throw new Error('Function not implemented.');
}

