import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.page.html',
  styleUrls: ['./order-details.page.scss'],
})
export class OrderDetailsPage implements OnInit {
  orderId: string=""; // Initialize orderId with a default value
  orderDetails: any;
  
  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
// Use ?? to handle null and assign a default value
    this.orderId = this.route.snapshot.paramMap.get('id')?? '';
    this.fetchOrderDetails();
  }

  fetchOrderDetails() {
    // Implement logic to fetch order details from the backend
  }

}
