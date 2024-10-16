import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastController, AlertController } from '@ionic/angular';

interface User {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-admin-customer-management',
  templateUrl: './admin-customer-management.page.html',
  styleUrls: ['./admin-customer-management.page.scss'],
})
export class AdminCustomerManagementPage implements OnInit {
  users: User[] = [];

  searchQuery: string = '';
  selectedFilter: string = '';

  filteredUsers: any[] = [];

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.http.get<User[]>('http://localhost/user_api/register.php?role=customer')
      .subscribe(
        data => {
          console.log('Fetched customers:', data);
          this.users = data;
          this.filterUsers();  // Apply filter after loading customers
        },
        (error: HttpErrorResponse) => {
          console.error('Error fetching customers:', error);
          this.presentToast('Error loading customers: ' + error.message, 'danger');
        }
      );
  }

  filterUsers() {
    // Normalize the search query for easier matching
    const search = this.searchQuery.toLowerCase();
  
    // Apply search and role filter
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch =
        user.first_name.toLowerCase().includes(search) ||
        user.last_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search);
  
      const matchesRole =
        this.selectedFilter === '' || 
        this.selectedFilter === 'all' || 
        user.role.toLowerCase() === this.selectedFilter.toLowerCase();
  
      return matchesSearch && matchesRole;
    });
  }
  

  async editUser(user: User) {
    const alert = await this.alertController.create({
      header: 'Edit Customer',
      inputs: [
        { name: 'username', type: 'text', value: user.username, placeholder: 'Username' },
        { name: 'first_name', type: 'text', value: user.first_name, placeholder: 'First Name' },
        { name: 'last_name', type: 'text', value: user.last_name, placeholder: 'Last Name' },
        { name: 'email', type: 'text', value: user.email, placeholder: 'Email' },
        { name: 'role', type: 'text', value: user.role, placeholder: 'Role' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            this.http.put<{status: number, message: string}>(`http://localhost/user_api/register.php?user_id=${user.user_id}`, data)
              .subscribe(
                async (response) => {
                  if (response.status === 1) {
                    await this.presentToast('Customer updated successfully', 'success');
                    this.loadCustomers();
                  } else {
                    await this.presentToast('Update failed: ' + response.message, 'danger');
                  }
                },
                async (error: HttpErrorResponse) => {
                  console.error('Error during update:', error);
                  await this.presentToast('Error during update: ' + error.message, 'danger');
                }
              );
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteUser(user_id: number) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this customer?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Delete canceled');
          }
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.http.delete<{ status: number, message: string }>(`http://localhost/user_api/register.php?user_id=${user_id}`)
              .subscribe(
                async (response) => {
                  if (response.status === 1) {
                    await this.presentToast('Customer deleted successfully', 'success');
                    this.loadCustomers(); // Refresh the list after deletion
                  } else {
                    await this.presentToast('Deletion failed: ' + response.message, 'danger');
                  }
                },
                async (error: HttpErrorResponse) => {
                  console.error('Error during deletion:', error);
                  await this.presentToast('Error during deletion: ' + error.message, 'danger');
                }
              );
          }
        }
      ]
    });

    await alert.present();
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}
