import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Promotion {
  promotion_id?: number;
  name: string;
  description: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  product_id: number;
}

interface Product {
  product_id: number;
  name: string;
}

@Component({
  selector: 'app-promotion-management',
  templateUrl: './promotion-management.component.html',
  styleUrls: ['./promotion-management.component.scss']
})
export class PromotionManagementComponent implements OnInit {
  promotions: Promotion[] = [];
  products: Product[] = [];
  promotionForm: FormGroup;
  editMode = false;
  currentPromotionId?: number;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toastController: ToastController
  ) {
    this.promotionForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      discount_percentage: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      product_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadPromotions();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }

  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php')
      .subscribe(
        data => {
          this.products = data;
        },
        (error: HttpErrorResponse) => {
          this.showToast('Failed to load products.', 'danger');
        }
      );
  }

  loadPromotions() {
    this.http.get<Promotion[]>('http://localhost/user_api/promotions.php')
      .subscribe(
        data => {
          this.promotions = data;
        },
        (error: HttpErrorResponse) => {
          this.showToast('Failed to load promotions.', 'danger');
        }
      );
  }

  onSubmit() {
    if (this.promotionForm.valid) {
      const promotion = this.promotionForm.value;

      if (this.editMode && this.currentPromotionId) {
        this.http.put(`http://localhost/user_api/promotions.php?id=${this.currentPromotionId}`, promotion)
          .subscribe(
            () => {
              this.loadPromotions();
              this.resetForm();
              this.showToast('Promotion updated successfully.', 'success');
            },
            (error: HttpErrorResponse) => {
              this.showToast('Failed to update promotion.', 'danger');
            }
          );
      } else {
        this.http.post('http://localhost/user_api/promotions.php', promotion)
          .subscribe(
            () => {
              this.loadPromotions();
              this.resetForm();
              this.showToast('Promotion added successfully.', 'success');
            },
            (error: HttpErrorResponse) => {
              this.showToast('Failed to add promotion.', 'danger');
            }
          );
      }
    }
  }

  editPromotion(promotion: Promotion) {
    this.editMode = true;
    this.currentPromotionId = promotion.promotion_id;
    this.promotionForm.patchValue(promotion);
  }

  deletePromotion(id?: number) {
    if (id && confirm('Are you sure you want to delete this promotion?')) {
      this.http.delete(`http://localhost/api/promotions.php?id=${id}`)
        .subscribe(
          () => {
            this.loadPromotions();
            this.showToast('Promotion deleted successfully.', 'success');
          },
          (error: HttpErrorResponse) => {
            this.showToast('Failed to delete promotion.', 'danger');
          }
        );
    }
  }

  resetForm() {
    this.editMode = false;
    this.currentPromotionId = undefined;
    this.promotionForm.reset();
    this.showToast('Form reset.', 'secondary');
  }
}
