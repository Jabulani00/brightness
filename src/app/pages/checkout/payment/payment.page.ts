import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage {
  cardNumber!: string;
  expirationDate!: string;
  cvv!: string;
  promoCode!: string;
  

  constructor(private router: Router) { }
  onApplyPromoCode() {
    // Apply the promo code and update the total
  }

  onContinue() {
    // Navigate to the shipping address page
    this.router.navigate(['/pages/checkout/order-summary']);
  }

  ngOnInit(){
    
  }

  // selectPaymentMethod(method: string) {
  //   this.paymentMethod = method;
  //   // Store the payment method in a service or local storage
  //   this.router.navigate(['/checkout/order-summary']);
  // }
}
  


