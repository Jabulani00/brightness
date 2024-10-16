import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';


@Component({
  selector: 'app-shipping-address',
  templateUrl: './shipping-address.page.html',
  styleUrls: ['./shipping-address.page.scss'],
})
export class ShippingAddressPage  {
  firstName!: string;
  lastName!: string;
  // address!: string;
  // address2!: string;
  city!: string;
  postalCode!: string;
  region!: string;
  shippingAddressForm!: FormGroup;
  isWalkInPickup = false;

  addresses: any[] = []; // Fetch from a service or API

  constructor(private router: Router,private formBuilder: FormBuilder ) {
    this.shippingAddressForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [''],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      region: [''],
    });
   }
  onContinue() {
    // Navigate to the payment page
    this.router.navigate(['/pages/checkout/payment']);
  }

  onWalkInPickupToggle() {
    this.isWalkInPickup = !this.isWalkInPickup;
  }


  ngOnInit(){
   
  }

  selectAddress(address: any) {
    // Store the selected address in a service or local storage
    this.router.navigate(['/checkout/payment']);
  }

  addNewAddress() {
    // Implement logic to add a new address
  }
}




