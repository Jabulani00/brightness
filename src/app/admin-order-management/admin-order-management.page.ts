import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { catchError, tap } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

@Component({
  selector: 'app-admin-order-management',
  templateUrl: './admin-order-management.page.html',
  styleUrls: ['./admin-order-management.page.scss'],
})
export class AdminOrderManagementPage implements OnInit {
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

  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'payment-received', label: 'Payment Received' },
    { value: 'order-processed', label: 'Processed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' }
  ];

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
          this.applyFilters();
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

    const updateData = {
      status: this.selectedStatus,
      previousStatus: this.currentOrder.status
    };

    this.http.put(`http://localhost/user_api/orders.php?id=${this.currentOrder.order_id}`, updateData)
      .pipe(
        tap(response => {
          console.log('Server Response:', JSON.stringify(response, null, 2));
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error updating order status:', error);
          if (error.error instanceof ErrorEvent) {
            // Client-side or network error occurred
            console.error('An error occurred:', error.error.message);
          } else {
            // Backend returned an unsuccessful response code
            console.error(
              `Backend returned code ${error.status}, ` +
              `body was: ${JSON.stringify(error.error)}`
            );
          }
          this.presentToast('Failed to update order status. Please check the console for more details.', 'danger');
          return throwError(() => new Error('Something bad happened; please try again later.'));
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.success) {
            this.presentToast('Order status updated successfully', 'success');
            this.fetchOrders();
            this.updateStatusModal.dismiss();
          } else {
            console.error('Unexpected server response:', response);
            this.presentToast(response && response.message || 'Failed to update order status', 'danger');
          }
        },
        error: (err) => {
          console.error('Subscription error:', err);
          this.presentToast('An error occurred while processing the response', 'danger');
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
}