import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonModal } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { finalize } from 'rxjs/operators';
import { Camera, CameraPhoto, CameraResultType, CameraSource } from '@capacitor/camera';
import jsQR from 'jsqr';
import { Capacitor } from '@capacitor/core';
import { CameraService } from '../services/camera.service';
import {
  AlertController,
  LoadingController,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { CategoryManagementComponent } from '../category-management/category-management.component';
import { PromotionManagementComponent } from '../promotion-management/promotion-management.component';

interface Product {
  product_id: number;
  name: string;
  category: string;
  stock_quantity: number;
  barcode: string;
  description: string;
  price: number;
  image_url: string;
  additional_images?: string[];
  sales_count?: number;         // Number of units sold
  last_sale_date?: Date;        // Date of last sale
  movement_rate?: number;       // Calculated movement rate
  movement_category?: 'fast' | 'medium' | 'slow'; // Classification
}



interface Category {
  category_id: number;
  name: string;
}

@Component({
  selector: 'app-admin-inventory-management',
  templateUrl: './admin-inventory-management.page.html',
  styleUrls: ['./admin-inventory-management.page.scss'],
})
export class AdminInventoryManagementPage implements OnInit {
  @ViewChild('addItemModal') addItemModal?: IonModal;
  @ViewChild('videoElement', { static: false }) videoElement?: ElementRef<HTMLVideoElement>;
  newItem: Product = {
    product_id: 0,
    name: '',
    category: '',
    stock_quantity: 0,
    barcode: '',
    description: '',
    price: 0,
    image_url: '',
    additional_images: []
  };

  fastMovingThreshold: number = 100; // Items sold per month threshold for fast-moving
  slowMovingThreshold: number = 20;  // Items sold per month threshold for slow-moving
  selectedMovementView: 'fast' | 'slow' = 'fast';
  
  products: Product[] = [];
  fastMoving: Product[] = [];
  slowMoving: Product[] = [];
  lowStockAlert: Product[] = [];
  coverImageBase64: string = '';
  additionalImagesBase64: string[] = [];
  showVideoPreview = false;
  categories: Category[] = [];

  searchQuery: string = '';
  selectedFilter: string = '';

  filteredUsers: any[] = [];

  product: Product[] = [];

  filteredProducts: Product[] = [];
  selectedCategory: string = '';
  selectedStatus: string = '';
  selectedStockLevel: string = '';
  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private cameraService: CameraService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.calculateMovementRates();
  }

  ngAfterViewInit() {
    // Ensure the video element is available
    console.log('Video element:', this.videoElement);
  }

  calculateMovementRates() {
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    this.products.forEach(product => {
      // Calculate monthly sales rate
      if (product.sales_count && product.last_sale_date) {
        const lastSaleDate = new Date(product.last_sale_date);
        const daysSinceLastSale = Math.max(1, Math.floor((currentDate.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)));
        product.movement_rate = (product.sales_count / daysSinceLastSale) * 30; // Monthly rate

        // Classify movement
        if (product.movement_rate >= this.fastMovingThreshold) {
          product.movement_category = 'fast';
        } else if (product.movement_rate <= this.slowMovingThreshold) {
          product.movement_category = 'slow';
        } else {
          product.movement_category = 'medium';
        }
      } else {
        product.movement_rate = 0;
        product.movement_category = 'slow';
      }
    });

    // Update fast and slow moving lists
    this.updateMovementLists();
  }

  // Update the movement lists
  updateMovementLists() {
    this.fastMoving = this.products
      .filter(p => p.movement_category === 'fast')
      .sort((a, b) => (b.movement_rate || 0) - (a.movement_rate || 0))
      .slice(0, 10);

    this.slowMoving = this.products
      .filter(p => p.movement_category === 'slow')
      .sort((a, b) => (a.movement_rate || 0) - (b.movement_rate || 0))
      .slice(0, 10);
  }

  // Toggle between fast and slow moving views
  toggleMovementView(event: any) {
    const value = event.detail.value;
    if (value === 'fast' || value === 'slow') {
      this.selectedMovementView = value;
    }
  }

  // Alternative method with type safety
  handleMovementViewChange(event: CustomEvent) {
    const value = event.detail.value;
    if (value === 'fast' || value === 'slow') {
      this.selectedMovementView = value;
    }
  }

  // Get movement status class
  getMovementStatusClass(rate: number | undefined): string {
    if (!rate) return 'movement-none';
    if (rate >= this.fastMovingThreshold) return 'movement-fast';
    if (rate <= this.slowMovingThreshold) return 'movement-slow';
    return 'movement-medium';
  }

  // Format movement rate for display
  formatMovementRate(rate: number | undefined): string {
    if (!rate) return '0';
    return rate.toFixed(1) + ' units/month';
  }

  async openCategoryManagementModal() {
    const modal = await this.modalController.create({
      component: CategoryManagementComponent
    });
    return await modal.present();
  }

  async openPromotionManagementModal() {
    const modal = await this.modalController.create({
      component: PromotionManagementComponent
    });
    return await modal.present();
  }

  async presentAddItemModal() {
    await this.addItemModal?.present();
  }

  dismissModal() {
    this.addItemModal?.dismiss();
    this.clearFields();
  }

  applyFilters() {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = this.searchQuery ? 
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) : true;

      const matchesCategory = this.selectedCategory ? 
        product.category === this.selectedCategory : true;

      const matchesStatus = this.selectedStatus ? 
        (this.selectedStatus === 'available' ? 
          product.stock_quantity > 0 : 
          product.stock_quantity === 0) : true;

      const matchesStockLevel = this.getStockLevelMatch(product.stock_quantity);

      return matchesSearch && matchesCategory && matchesStatus && matchesStockLevel;
    });
  }

  getStockLevelMatch(stockQuantity: number): boolean {
    switch (this.selectedStockLevel) {
      case 'low':
        return stockQuantity < 75;
      case 'medium':
        return stockQuantity >= 75 && stockQuantity < 150;
      case 'high':
        return stockQuantity >= 150;
      default:
        return true;
    }
  }

  // Event handlers for filters
  onSearchChange(event: any) {
    this.searchQuery = event.detail.value;
    this.applyFilters();
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value;
    this.applyFilters();
  }

  onStatusChange(event: any) {
    this.selectedStatus = event.detail.value;
    this.applyFilters();
  }

  onStockLevelChange(event: any) {
    this.selectedStockLevel = event.detail.value;
    this.applyFilters();
  }

  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php')
      .subscribe(
        data => {
          this.products = data;
          this.updateProductLists();
        },
        (error: HttpErrorResponse) => {
          console.error('Error fetching products:', error);
          this.presentToast('Error loading products: ' + error.message, 'danger');
        }
      );
  }

  updateProductLists() {
    const sortedProducts = [...this.products].sort((a, b) => b.stock_quantity - a.stock_quantity);
    this.fastMoving = sortedProducts.slice(0, 5);
    this.slowMoving = sortedProducts.slice(-5).reverse();
    this.lowStockAlert = this.products.filter(p => p.stock_quantity < 75);
  }

  loadCategories() {
    this.http.get<Category[]>('http://localhost/user_api/categories.php')
      .subscribe(
        (data: Category[]) => {
          this.categories = data;
        },
        (error: HttpErrorResponse) => {
          console.error('Error fetching categories:', error);
          this.presentToast('Error loading categories: ' + error.message, 'danger');
        }
      );
  }

  async submitForm() {

    if (!this.newItem.name || !this.newItem.category || !this.newItem.stock_quantity || 
      !this.newItem.barcode || !this.newItem.price) {
    await this.presentToast('Please fill in all required fields', 'danger');
    return;
  }
    const loading = await this.loadingController.create({
      message: 'inserting products...',
    });
    await loading.present();
  
    try {
      // Check if the product already exists by name or barcode
      const existingProductResponse = await this.http.get<{ status: number, message: string, product: any }>(
        `http://localhost/user_api/products.php?name=${this.newItem.name}&barcode=${this.newItem.barcode}`
      ).toPromise();
  
      if (existingProductResponse && existingProductResponse.status === 1 && existingProductResponse.product) {
        await loading.dismiss();
        await this.presentToast('Product with the same name or barcode already exists!', 'danger');
        return; // Stop execution if the product already exists
      }
  
      // Proceed with uploading the cover image if the product doesn't exist
      if (this.coverImageBase64) {
        const coverImageUrl = await this.uploadImage(this.coverImageBase64);
        this.newItem.image_url = coverImageUrl;
      }
  
      // Upload additional images if any
      if (this.additionalImagesBase64.length > 0) {
        this.newItem.additional_images = await Promise.all(
          this.additionalImagesBase64.map(async img => {
            const loadingImage = await this.loadingController.create({
              message: 'Uploading additional image...',
            });
            await loadingImage.present();
            const imageUrl = await this.uploadImage(img);
            await loadingImage.dismiss();
            return imageUrl;
          })
        );
      }
  
      // Save to MySQL and get the product_id
      const response = await this.http.post<{ status: number, message: string, product_id: number }>(
        'http://localhost/user_api/products.php',
        this.newItem
      ).toPromise();
  
      if (response && response.status === 1 && response.product_id) {
        // Set product_id to the response product_id
        this.newItem.product_id = response.product_id;
  
        // Save to Firestore using the product_id from MySQL
        await this.firestore.collection('products').doc(`${response.product_id}`).set(this.newItem);
  
        await this.presentToast('Product added successfully', 'success');
        this.dismissModal();
        this.loadProducts();
      } else {
        await this.presentToast('Submission failed: ' + (response ? response.message : 'Unknown error'), 'danger');
      }
    } catch (error) {
      console.error('Error during submission:', error);
      await this.presentToast('Error during submission: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger');
    } finally {
      await loading.dismiss();
    }
  }
  
  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
          this.coverImageBase64 = (e.target?.result as string).split(',')[1]; // Remove the data:image/jpeg;base64, part
          await this.presentToast('Image uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
      } else {
        await this.presentToast('No image selected', 'danger');
      }
    };
    
    input.click();
  }
     
  async scanBarcode() {
    try {
      const stream = await this.cameraService.startCamera();
      const video: HTMLVideoElement = document.querySelector('video')!;
      video.srcObject = stream;
      await video.play();

      requestAnimationFrame(this.scan.bind(this));
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  }

  private scan() {
    const video: HTMLVideoElement = document.querySelector('video')!;
    const canvas: HTMLCanvasElement = document.querySelector('canvas')!;
    const context = canvas.getContext('2d')!;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log('Found QR code', code.data);
        this.newItem.barcode = code.data;
        this.cameraService.stopCamera();
      } else {
        requestAnimationFrame(this.scan.bind(this));
      }
    } else {
      requestAnimationFrame(this.scan.bind(this));
    }
  }

  async checkCameraPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      console.log('Running on web, camera permissions not applicable');
      return true; // Assume permission granted on web
    }
    
    const permissions = await Camera.checkPermissions();
    console.log('Camera permissions:', permissions);
    if (permissions.camera === 'denied' || permissions.camera === 'prompt') {
      const permissionRequest = await Camera.requestPermissions();
      console.log('Requesting camera permissions:', permissionRequest);
      return permissionRequest.camera === 'granted';
    }
    return permissions.camera === 'granted';
  }
  
  async takeCoverPicture(event: Event) {
    event.preventDefault();
    const loading = await this.loadingController.create({
      message: 'Opening camera...',
    });
    await loading.present();

    try {
      const stream = await this.cameraService.startCamera();
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.showVideoPreview = true;
      } else {
        throw new Error('Video element not found');
      }
      await loading.dismiss();
    } catch (error) {
      console.error('Error opening camera:', error);
      await this.presentToast('Error opening camera: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger');
      this.openFilePicker();
    } finally {
      await loading.dismiss();
    }
  }


  async captureImage(event: Event) {
    event.preventDefault();
    try {
      const imageData = await this.cameraService.captureImage();
      this.coverImageBase64 = imageData;
      await this.presentToast('Cover image captured successfully', 'success');
    } catch (error) {
      console.error('Error capturing image:', error);
      await this.presentToast('Error capturing image: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger');
    } finally {
      this.showVideoPreview = false;
      this.cameraService.stopCamera();
    }
  }
  

async takeAdditionalPicture(event: Event) {
  event.preventDefault();
    const loading = await this.loadingController.create({
        message: 'Opening camera for additional image...',
    });
    await loading.present();

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera, // or CameraSource.Photos for the gallery
    });
    

        this.additionalImagesBase64.push(image.base64String || '');
        await this.presentToast('Additional image selected successfully', 'success');
    } catch (error) {
        console.error('Error taking additional picture:', error);
        await this.presentToast('Error taking additional picture: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger');
    } finally {
        await loading.dismiss();
    }
}



  async uploadImage(base64Image: string): Promise<string> {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filePath = `product_images/${fileName}.jpg`;
    const fileRef = this.storage.ref(filePath);
    const task = fileRef.putString(base64Image, 'base64', { contentType: 'image/jpeg' });

    return new Promise((resolve, reject) => {
      task.snapshotChanges().pipe(
        finalize(async () => {
          try {
            const downloadUrl = await fileRef.getDownloadURL().toPromise();
            resolve(downloadUrl);
          } catch (error) {
            reject(error);
          }
        })
      ).subscribe();
    });
  }

  removeAdditionalImage(index: number, event: Event) {
    event.preventDefault();
    this.additionalImagesBase64.splice(index, 1);
  }


  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  clearFields() {
    this.newItem = {
      product_id: 0,
      name: '',
      category: '',
      stock_quantity: 0,
      barcode: '',
      description: '',
      price: 0,
      image_url: ''
    };
  }

  async editItem(product: Product) {
    const alert = await this.alertController.create({
      header: 'Edit Product',
      inputs: [
        { name: 'name', type: 'text', value: product.name, placeholder: 'Product Name' },
        { name: 'category', type: 'text', value: product.category, placeholder: 'Category' },
        { name: 'stock_quantity', type: 'number', value: product.stock_quantity, placeholder: 'Quantity' },
        { name: 'barcode', type: 'text', value: product.barcode, placeholder: 'Barcode' },
        { name: 'description', type: 'textarea', value: product.description, placeholder: 'Description' },
        { name: 'price', type: 'number', value: product.price, placeholder: 'Price' },
        { name: 'image_url', type: 'text', value: product.image_url, placeholder: 'Image URL' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            this.http.put<{status: number, message: string}>(`http://localhost/user_api/products.php?id=${product.product_id}`, data)
              .subscribe(
                async (response) => {
                  if (response.status === 1) {
                    await this.presentToast('Product updated successfully', 'success');
                    this.loadProducts();
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

  async updateQuantity(product: Product, operation: 'add' | 'subtract') {
    const alert = await this.alertController.create({
      header: `${operation === 'add' ? 'Add to' : 'Subtract from'} Quantity`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Enter quantity',
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: (data) => {
            const quantity = parseInt(data.quantity);
            if (isNaN(quantity) || quantity <= 0) {
              this.presentToast('Please enter a valid quantity', 'danger');
              return;
            }
  
            this.http.put<{status: number, message: string, new_quantity: number}>(
              `http://localhost/user_api/products.php?id=${product.product_id}`,
              { 
                stock_quantity: quantity,
                quantity_operation: operation
              }
            ).subscribe(
              async (response) => {
                if (response.status === 1) {
                  await this.presentToast('Quantity updated successfully', 'success');
                  product.stock_quantity = response.new_quantity; // Update the local product object
                  this.updateProductLists(); // Refresh the product lists
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

  async deleteItem(id: number) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this product?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: () => {
            this.http.delete<{status: number, message: string}>(`http://localhost/user_api/products.php?id=${id}`)
              .subscribe(
                async (response) => {
                  if (response.status === 1) {
                    await this.presentToast('Product deleted successfully', 'success');
                    this.loadProducts();
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
}