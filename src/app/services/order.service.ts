import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
    })
    export class OrderService {
        constructor(private http: HttpClient) {}
        placeOrder(orderDetails: any): Observable<any> {
            // Implement API call to place the order
            return this.http.post('/api/orders', orderDetails);
            }
    getOrderStatus(orderId: string): Observable<any> {
                // Implement API call to get order status
               return this.http.get(`/api/orders/${orderId.toString()}/status`);
    }

    updateOrderStatus(orderId: string, status: string): Observable<any> {
                    // Implement API call to update order status
                    // This should trigger an email notification on the backend
                    return this.http.get(`/api/orders/${orderId.toString()}/status`);
       
                    }}
                    
