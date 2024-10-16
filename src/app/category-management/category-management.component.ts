import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss'],
})
export class CategoryManagementComponent implements OnInit {
  categories: any[] = [];
  categoryForm: FormGroup;

  constructor(
    private modalController: ModalController,
    private http: HttpClient,
    private toastController: ToastController,
    private formBuilder: FormBuilder
  ) {
    this.categoryForm = this.formBuilder.group({
      newCategory: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  loadCategories() {
    this.http.get('http://localhost/user_api/categories.php').subscribe(
      (data: any) => {
        this.categories = data;
        this.presentToast('Categories loaded successfully');
      },
      (error: HttpErrorResponse) => {
        console.error('Error fetching categories:', error);
        this.presentToast('Error loading categories: ' + error.message, 'danger');
      }
    );
  }

  addCategory() {
    if (this.categoryForm.valid) {
      const newCategory = this.categoryForm.get('newCategory')?.value.trim();
      console.log('Attempting to add category:', newCategory);
      
      this.http.post('http://localhost/user_api/categories.php', { name: newCategory }).subscribe(
        (response: any) => {
          console.log('Server response:', response);
          if (response.success) {
            this.loadCategories();
            this.categoryForm.reset();
            this.presentToast(response.message);
          } else {
            this.presentToast(response.message || 'Unknown error occurred', 'danger');
          }
        },
        (error: HttpErrorResponse) => {
          console.error('Error adding category:', error);
          this.presentToast('Error adding category: ' + (error.error?.message || error.message), 'danger');
        }
      );
    } else {
      console.log('Form is invalid');
      this.presentToast('Please enter a valid category name', 'warning');
    }
  }

  editCategory(category: any) {
    // Implement edit functionality
    this.presentToast('Edit functionality not implemented yet', 'warning');
  }

  deleteCategory(category_id: number) {
    this.http.delete(`http://localhost/user_api/categories.php?category_id=${category_id}`).subscribe(
      (response: any) => {
        if (response.success) {
          this.loadCategories();
          this.presentToast(response.message);
        } else {
          this.presentToast(response.message, 'danger');
        }
      },
      (error: HttpErrorResponse) => {
        console.error('Error deleting category:', error);
        this.presentToast('Error deleting category: ' + error.message, 'danger');
      }
    );
  }

  dismissModal() {
    this.modalController.dismiss();
  }
}