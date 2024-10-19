import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Chart } from 'chart.js/auto';

interface User {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Order {
  order_id: number;
  user_id: number;
  total_amount: string;
  order_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit, AfterViewInit {
  @ViewChild('orderTypeChart') orderTypeChart!: ElementRef;
  @ViewChild('monthlySpendingChart') monthlySpendingChart!: ElementRef;


  isLoggedIn: boolean = false;
  currentUser: User | null = null;
  orders: Order[] = [];
  userId: string | null = null;
  loading: boolean = true;
  ordersLoading: boolean = true;
  error: string | null = null;
  ordersError: string | null = null;
  selectedStatus: string = 'all';
  showAllOrders: boolean = false;
  allOrders: Order[] = [];
  displayedOrders: Order[] = [];
  private apiUrl = 'http://localhost/user_api/login.php';
  private ordersApiUrl = 'http://localhost/user_api/orders.php';

  // New properties for statistics
  totalSpent: number = 0;
  averageOrderValue: number = 0;
  orderTypeData: { type: string, count: number }[] = [];
  monthlySpendingData: { month: string, amount: number }[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.getUserId();
  }

  ngAfterViewInit() {
    if (this.allOrders.length > 0) {
      this.createOrderTypeChart();
      this.createMonthlySpendingChart();
    }
  }

  async getUserId() {
    this.userId = sessionStorage.getItem('userId');
    console.log('Stored userId in sessionStorage:', this.userId);
    if (!this.userId) {
      this.isLoggedIn = false;
      await this.presentToast('You need to log in to view your account', 'warning');
      this.router.navigate(['/home']);
      return;
    }
    
    this.fetchUserDetails();
  }
  
  private fetchUserDetails() {
    if (!this.userId) return;

    this.loading = true;
    this.http.get<User>(`${this.apiUrl}?user_id=${this.userId}`).subscribe({
      next: async (user) => {
        this.currentUser = user;
        this.isLoggedIn = true;
        this.loading = false;
        await this.presentToast('User details loaded successfully', 'success');
        this.fetchOrders();
      },
      error: async (error: HttpErrorResponse) => {
        this.error = 'Failed to load user details';
        this.loading = false;
        
        let errorMessage = 'An error occurred while loading user details';
        if (error.status === 404) {
          errorMessage = 'User not found';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check if the server is running.';
        }
        
        await this.presentToast(errorMessage, 'danger');
        console.error('Error fetching user details:', error);
      }
    });
  }

  private fetchOrders() {
    if (!this.userId) return;
  
    console.log('Fetching orders for user ID:', this.userId);
  
    this.ordersLoading = true;
    this.http.get<{ orderData: Order[] }>(`${this.ordersApiUrl}?user_id=${this.userId}`).subscribe({
      next: async (response) => {
        console.log('Raw API response:', response);
        this.allOrders = response.orderData.filter(order => order.user_id.toString() === this.userId);
        this.filterOrders();
        this.ordersLoading = false;
        
        if (this.allOrders.length === 0) {
          this.ordersError = 'No orders found for this user';
          await this.presentToast('No orders found', 'warning');
        } else {
          await this.presentToast('Orders loaded successfully', 'success');
          this.calculateOrderStatistics();
          this.createOrderTypeChart();
          this.createMonthlySpendingChart();
        }
      },
      error: async (error: HttpErrorResponse) => {
        this.ordersError = 'Failed to load orders';
        this.ordersLoading = false;
        
        let errorMessage = 'An error occurred while loading orders';
        if (error.status === 404) {
          errorMessage = 'Orders not found';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check if the server is running.';
        }
        
        await this.presentToast(errorMessage, 'danger');
        console.error('Error fetching orders:', error);
      }
    });
  }

  filterOrders() {
    let filteredOrders = this.selectedStatus === 'all' 
      ? this.allOrders 
      : this.allOrders.filter(order => order.status === this.selectedStatus);
    
    this.displayedOrders = this.showAllOrders ? filteredOrders : filteredOrders.slice(0, 3);
  }

  onStatusChange() {
    this.showAllOrders = false;
    this.filterOrders();
  }

  toggleShowAllOrders() {
    this.showAllOrders = !this.showAllOrders;
    this.filterOrders();
  }
  
  async logout() {
    sessionStorage.removeItem('userId');
    this.isLoggedIn = false;
    this.currentUser = null;
    await this.presentToast('You have logged out successfully', 'success');
    this.router.navigate(['/login']);
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  calculateOrderStatistics() {
    this.calculateTotalSpent();
    this.calculateAverageOrderValue();
    this.calculateOrderTypeDistribution();
    this.calculateMonthlySpending();
  }

  calculateTotalSpent() {
    this.totalSpent = this.allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
  }

  calculateAverageOrderValue() {
    this.averageOrderValue = this.totalSpent / this.allOrders.length;
  }

  calculateOrderTypeDistribution() {
    const typeCount: { [key: string]: number } = {};
    this.allOrders.forEach(order => {
      typeCount[order.order_type] = (typeCount[order.order_type] || 0) + 1;
    });
    this.orderTypeData = Object.entries(typeCount).map(([type, count]) => ({ type, count }));
  }

  calculateMonthlySpending() {
    const monthlySpending: { [key: string]: number } = {};
    this.allOrders.forEach(order => {
      const date = new Date(order.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + parseFloat(order.total_amount);
    });
    this.monthlySpendingData = Object.entries(monthlySpending)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  createOrderTypeChart() {
    if (!this.orderTypeChart) return;

    const ctx = this.orderTypeChart.nativeElement.getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.orderTypeData.map(item => item.type),
        datasets: [{
          data: this.orderTypeData.map(item => item.count),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Order Type Distribution'
          }
        }
      }
    });
  }

  createMonthlySpendingChart() {
    if (!this.monthlySpendingChart) return;

    const ctx = this.monthlySpendingChart.nativeElement.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlySpendingData.map(item => item.month),
        datasets: [{
          label: 'Monthly Spending',
          data: this.monthlySpendingData.map(item => item.amount),
          backgroundColor: '#36A2EB'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount (R)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Month'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Spending'
          }
        }
      }
    });
  }
}