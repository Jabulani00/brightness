import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.page.html',
  styleUrls: ['./order-summary.page.scss'],
})
export class OrderSummaryPage  {
  items = [
    {
      name: 'Leather Belt',
      price: 54.15,
      quantity: 1,
    },
  ];
  shippingCost = 13.92;
  dutiesAndTaxes = 202.47;
  total = 1616.55;

  // orderDetails: any; // Fetch from a service or local storage

  constructor(private router: Router) { 

  }
  
  onConfirmOrder() {
    // Implement the logic to confirm the order
  }


  // placeOrder() {
  //   // Implement order placement logic
  //   // Send order details to the backend
  //   // Once successful, send confirmation email
  //   this.sendConfirmationEmail();
  //   this.router.navigate(['/order-confirmation']);
  // }
  private sendConfirmationEmail() {
    // Implement email sending logic (usually done on the backend)
  }
  ngOnInit() {
   
  }

}
 
