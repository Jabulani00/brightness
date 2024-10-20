import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { catchError, tap } from 'rxjs/operators';
import { Observable, of, throwError, forkJoin } from 'rxjs';

@Component({
  selector: 'app-cashier',
  templateUrl: './cashier.page.html',
  styleUrls: ['./cashier.page.scss'],
})
export class CashierPage implements OnInit {
  @ViewChild('updateStatusModal') updateStatusModal!: IonModal;
  @ViewChild('viewOrderModal') viewOrderModal!: IonModal;
  currentOrderDetails: any = null;
  
  orderData: any[] = [];
  selectedStatus: string = '';
  currentOrder: any = null;
  searchTerm: string = '';
  filterType: string = '';
  filterValue: string = '';
  filteredOrderData: any[] = [];

  paymentType: string = '';
  amountPaidInput: string = '';
  amountPaid: number = 0;
  isCheckoutComplete: boolean = false;
  receiptData: {
    date: string;
    cashier: string;
    cashierId: string;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
    paymentType: string;
    amountPaid: number;
    change: number;
  } | null = null;
  userId: string = '';


  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.fetchOrders();
  }

  fetchOrders() {
    this.http.get<{ orderData: any[] }>('http://localhost/user_api/orders.php')
      .subscribe(
        response => {
          this.orderData = response.orderData;
          this.applyFilters(); // Apply filters after fetching orders
        },
        error => {
          console.error('Error fetching orders:', error);
          this.presentToast('Failed to fetch orders', 'danger');
        }
      );
  }

  applyFilters() {
    this.filteredOrderData = this.orderData.filter(order => {
      const matchesSearch = this.searchTerm ? order.order_id.toString().includes(this.searchTerm) : true;
      let matchesFilter = true;

      if (this.filterType === 'status' && this.filterValue) {
        matchesFilter = order.status.toLowerCase() === this.filterValue.toLowerCase();
      } else if (this.filterType === 'date' && this.filterValue) {
        const orderDate = new Date(order.created_at).toDateString();
        const filterDate = new Date(this.filterValue).toDateString();
        matchesFilter = orderDate === filterDate;
      }

      return matchesSearch && matchesFilter;
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.applyFilters();
  }

  onFilterTypeChange(event: any) {
    this.filterType = event.detail.value;
    this.filterValue = ''; // Reset filter value when type changes
    this.applyFilters();
  }

  onFilterValueChange(event: any) {
    this.filterValue = event.detail.value;
    this.applyFilters();
  }

  async viewOrderDetails(order: any) {
    this.http.get(`http://localhost/user_api/orders.php?id=${order.order_id}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching order details:', error);
          this.presentToast('Failed to fetch order details', 'danger');
          return throwError(() => error);
        })
      )
      .subscribe((response: any) => {
        if (response.success) {
          this.currentOrderDetails = response.order;
          this.viewOrderModal.present();
        } else {
          this.presentToast(response.message || 'Failed to fetch order details', 'danger');
        }
      });
  }

  async openUpdateStatusModal(order: any) {
    this.currentOrder = order;
    this.selectedStatus = order.status;
    this.updateStatusModal.present();
  }

  updateOrderStatus() {
    if (!this.currentOrder || !this.selectedStatus) {
      console.error('Validation Error:', {
        currentOrder: this.currentOrder,
        selectedStatus: this.selectedStatus
      });
      this.presentToast('Please select a status', 'danger');
      return;
    }

    console.log('Attempting to update order:', {
      orderId: this.currentOrder.order_id,
      currentStatus: this.currentOrder.status,
      newStatus: this.selectedStatus,
      timestamp: new Date().toISOString()
    });

    this.http.get<any>(`http://localhost/user_api/orders.php?id=${this.currentOrder.order_id}`)
      .pipe(
        catchError(this.handleError<any>('fetchOrderDetails'))
      )
      .subscribe((orderDetails: any) => {
        if (orderDetails && orderDetails.success) {
          const updateData = {
            status: this.selectedStatus,
            previousStatus: this.currentOrder.status
          };

          this.http.put(`http://localhost/user_api/orders.php?id=${this.currentOrder.order_id}`, updateData)
            .pipe(
              tap(response => {
                console.log('Server Response:', {
                  response,
                  timestamp: new Date().toISOString()
                });
              }),
              catchError(this.handleError<any>('updateOrderStatus'))
            )
            .subscribe({
              next: (response: any) => {
                if (response && response.success) {
                  this.presentToast('Order status updated successfully', 'success');
                  this.fetchOrders();
                  this.updateStatusModal.dismiss();
                } else {
                  this.presentToast(response && response.message || 'Failed to update order status', 'danger');
                }
              }
            });
        } else {
          this.presentToast('Failed to fetch order details', 'danger');
        }
      });
  }

  async deleteOrder(order: any) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this order?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            this.http.delete(`http://localhost/user_api/orders.php?id=${order.order_id}`)
              .pipe(
                catchError(error => {
                  console.error('Error deleting order:', error);
                  this.presentToast('Failed to delete order', 'danger');
                  return throwError(() => error);
                })
              )
              .subscribe((response: any) => {
                if (response.success) {
                  this.presentToast('Order deleted successfully', 'success');
                  this.fetchOrders();
                } else {
                  this.presentToast(response.message || 'Failed to delete order', 'danger');
                }
              });
          }
        }
      ]
    });

    await alert.present();
  }

  async checkout() {
    if (this.currentOrderDetails.order_type !== 'walk-in') {
      await this.showAlert('Not a Walk-in Order', 'Checkout is only available for walk-in orders.');
      return;
    }

    if (!this.paymentType) {
      await this.showAlert('Payment Type Required', 'Please select a payment type before checkout.');
      return;
    }
  
    if (this.paymentType === 'cash') {
      if (!this.amountPaidInput) {
        await this.showAlert('Amount Required', 'Please enter the amount paid for cash transactions.');
        return;
      }
      await this.handleCashPayment();
    } else {
      await this.showCheckoutAlert();
    }
  }

  async handleCashPayment() {
    this.amountPaid = parseFloat(this.amountPaidInput);
    const total = parseFloat(this.currentOrderDetails.total_amount);
    if (this.amountPaid < total) {
      await this.showAlert('Insufficient Amount', 'The amount paid is less than the total due.');
      return;
    }
  
    const change = this.amountPaid - total;
  
    const alert = await this.alertController.create({
      header: 'Checkout',
      message: `
        Total: R${total.toFixed(2)}
<br>
        Amount Paid: R${this.amountPaid.toFixed(2)}
<br>
        Change: R${change.toFixed(2)}
      `,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            this.processOrder();
          }
        }
      ]
    });
  
    await alert.present();
  }

  async showCheckoutAlert() {
    const total = parseFloat(this.currentOrderDetails.total_amount);
  
    const alert = await this.alertController.create({
      header: 'Checkout',
      message: `Total: R${total.toFixed(2)}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            this.processOrder();
          }
        }
      ]
    });
  
    await alert.present();
  }

  async processOrder() {
    try {
      const orderId = this.currentOrderDetails.order_id;
      const total = parseFloat(this.currentOrderDetails.total_amount);
  
      // Update order status
      const statusUpdateResponse = await this.http.put<{success: boolean, message?: string}>(
        `http://localhost/user_api/orders.php?id=${orderId}`,
        { status: 'completed' }
      ).toPromise();
  
      if (!statusUpdateResponse || !statusUpdateResponse.success) {
        throw new Error(statusUpdateResponse?.message || 'Failed to update order status');
      }
  
      // Record sale
      const saleData = {
        order_id: orderId,
        cashier_id: this.userId,
        total_amount: total,
        payment_method: this.paymentType,
        amount_paid: this.paymentType === 'cash' ? parseFloat(this.amountPaidInput) : total
      };
  
      const saleResponse = await this.http.post<{ success: boolean, message: string, sale_id: number }>(
        'http://localhost/user_api/sales.php',
        saleData
      ).toPromise();
  
      if (!saleResponse || !saleResponse.success) {
        throw new Error(saleResponse?.message || 'Failed to record sale');
      }
  
      // Update stock quantities
      const stockUpdateRequests: Observable<{success: boolean, message?: string}>[] = this.currentOrderDetails.items.map((item: any) => 
        this.http.put<{success: boolean, message?: string}>(`http://localhost/user_api/update_stock.php`, {
          product_id: item.product_id,
          quantity: item.quantity
        })
      );
  
      const stockUpdateResponses = await forkJoin(stockUpdateRequests).toPromise();
      
      // Check if all stock updates were successful
      if (stockUpdateResponses) {
        const allStockUpdatesSuccessful = stockUpdateResponses.every((response) => response && response.success);
        if (!allStockUpdatesSuccessful) {
          throw new Error('Failed to update stock quantities for all items');
        }
      } else {
        throw new Error('Failed to update stock quantities');
      }
  
      await this.showAlert('Transaction Complete', `Thank you for your purchase! Order ID: ${orderId}`);
      this.completeTransaction();
  
    } catch (error) {
      console.error('Error completing transaction:', error);
      if (error instanceof HttpErrorResponse) {
        console.error('Error details:', error.error);
        await this.showAlert('Error', `Network error: ${error.message}`);
      } else if (error instanceof Error) {
        await this.showAlert('Error', error.message);
      } else {
        await this.showAlert('Error', 'There was an unexpected error completing the transaction. Please try again.');
      }
    }
  }

  completeTransaction() {
    this.prepareReceiptData();
    this.isCheckoutComplete = true;
    this.paymentType = '';
    this.amountPaidInput = '';
    this.printReceipt();
  }

  prepareReceiptData() {
    const total = parseFloat(this.currentOrderDetails.total_amount);
    const amountPaid = this.paymentType === 'cash' ? parseFloat(this.amountPaidInput) : total;
    const change = this.paymentType === 'cash' ? amountPaid - total : 0;
    
    this.receiptData = {
      date: new Date().toLocaleString(),
      cashier: 'John Doe', // Replace with actual cashier name
      cashierId: this.userId,
      items: this.currentOrderDetails.items,
      subtotal: total, // Assuming no tax for simplicity
      tax: 0, // Add tax calculation if needed
      total: total,
      paymentType: this.paymentType,
      amountPaid: amountPaid,
      change: change
    };
  }

  printReceipt() {
    // Implement receipt printing logic here
    console.log('Receipt Data:', this.receiptData);
    // You might want to open a new window or use a printing service to actually print the receipt
  }

  private async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      this.presentToast(`${operation} failed. Please try again.`, 'danger');
      return of(result as T);
    };
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}