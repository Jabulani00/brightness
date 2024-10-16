import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { PromotionService } from '../services/promotion.service'; 
import { Router } from '@angular/router';
import { AlertController,ToastController, AlertOptions } from '@ionic/angular';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { catchError, map, Observable, of, Subscription, throwError } from 'rxjs';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { LoadingController} from '@ionic/angular';
// import { AddressModalComponent } from './address-modal.component';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => void;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
})
export class CartPage implements OnInit {
  cartItems: any[] = [];
  promotions: any[] = [];
  deliveryMethod: string = 'delivery';
  selectedAddress: any = null;
  savedAddresses: any[] = []; // Fetch this from a service or storage
  userId: string | null = null;
  userEmail: string | null = null;

  subtotal: number = 0;
  discountedSubtotal: number = 0;
  tax: number = 0;
  total: number = 0;
  discountedTotal: number = 0;

  private cartSubscription: Subscription | undefined;

  constructor(
    private cartService: CartService,
    private promotionService: PromotionService, 
     private alertController: AlertController,
     private toastController: ToastController,
     private cd: ChangeDetectorRef,
     private http: HttpClient,
     private afStorage: AngularFireStorage,
     private loadingController: LoadingController,
     private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    this.loadCart();
    this.loadPromotions();
    this.getUserId();
    this.getUserEmail();
    this.loadSavedAddresses();
  }

  getUserId() {
    this.userId = sessionStorage.getItem('userId');
    if (!this.userId) {
      console.warn('User is not logged in');
      // You might want to redirect to login page or show a message
    }
  }

  getUserEmail() {
    this.userEmail = sessionStorage.getItem('userEmail');
    if (!this.userEmail) {
      console.warn('User email not found in session storage');
      // You might want to redirect to login page or show a message
    }
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  loadCart() {
    this.cartSubscription = this.cartService.getCart().subscribe({
      next: (items) => {
        this.cartItems = items.map(item => ({
          ...item,
          price: this.ensureValidNumber(item.price),
          quantity: this.ensureValidNumber(item.quantity)
        }));
        this.applyPromotions();
        console.log('Cart items:', this.cartItems);
        if (this.cartItems.length === 0) {
          this.showToast('Your cart is empty');
        }
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.showToast('Failed to load cart. Please try again later.');
      }
    });
  }

  loadPromotions() {
    this.promotionService.getPromotions().subscribe({
      next: (promotions) => {
        this.promotions = promotions.map(promo => ({
          ...promo,
          discount_percentage: this.ensureValidNumber(promo.discount_percentage)
        }));
        this.applyPromotions();
      },
      error: (error) => {
        console.error('Error loading promotions:', error);
      }
    });
  }

  applyPromotions() {
    this.cartItems.forEach(item => {
      const promotion = this.promotions.find(p => p.product_id === item.product_id);
      if (promotion) {
        const discountAmount = item.price * (promotion.discount_percentage / 100);
        item.discountedPrice = this.roundToTwo(item.price - discountAmount);
        item.hasPromotion = true;
        item.promotionName = promotion.name;
      } else {
        item.discountedPrice = item.price;
        item.hasPromotion = false;
      }
    });
    this.calculateTotals();
  }

  calculateTotals() {
    this.subtotal = this.roundToTwo(
      this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    );
    this.discountedSubtotal = this.roundToTwo(
      this.cartItems.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0)
    );
    this.tax = this.roundToTwo(this.discountedSubtotal * 0.15); // Assuming 15% tax rate
    this.total = this.roundToTwo(this.subtotal + this.tax);
    this.discountedTotal = this.roundToTwo(this.discountedSubtotal + this.tax);
  }

  ensureValidNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  removeItem(productId: number) {
    console.log('removeItem: Attempting to remove item with productId:', productId);
    this.cartService.removeFromCart(productId).subscribe({
      next: () => {
        console.log('removeItem: Item successfully removed from cart');
        this.showToast('Item removed from cart');
        this.loadCart();
      },
      error: (error: Error) => {
        this.showToast(`Failed to remove item from cart: ${error.message}`);
      }
    });
}

async updateQuantity(productId: number, newQuantity: number) {
  console.log('updateQuantity: Attempting to update quantity for productId:', productId, 'with new quantity:', newQuantity);
  if (newQuantity < 1) {
    console.log('updateQuantity: New quantity is less than 1, removing item with productId:', productId);
    this.removeItem(productId);
    return;
  }
  
  try {
    const response = await this.http.get<{quantity: number}>(
      `http://localhost/user_api/products.php?check_quantity=1&product_id=${productId}`
    ).toPromise();

    if (response && newQuantity <= response.quantity) {
      this.cartService.updateQuantity(productId, newQuantity).subscribe({
        next: () => {
          this.showToast('Quantity updated');
          this.loadCart();
        },
        error: (error) => {
          this.showToast(`Failed to update quantity for productId ${productId}: ${error.message}`);
        }
      });
    } else {
      const availableQuantity = response ? response.quantity : 0;
      this.showToast(`Sorry, only ${availableQuantity} units are available for this product.`);
      // Update to the maximum available quantity
      if (availableQuantity > 0) {
        this.cartService.updateQuantity(productId, availableQuantity).subscribe({
          next: () => {
            this.showToast(`Quantity updated to maximum available: ${availableQuantity}`);
            this.loadCart();
          },
          error: (error) => {
            this.showToast(`Failed to update quantity for productId ${productId}: ${error.message}`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error checking quantity for product ${productId}:`, error);
    this.showToast('Error checking product availability. Please try again.');
  }
}

async enterCustomQuantity(productId: number) {
  const item = this.cartItems.find(i => i.product_id === productId);
  if (!item) return;

  const alert = await this.alertController.create({
    header: 'Enter Quantity',
    inputs: [
      {
        name: 'quantity',
        type: 'number',
        placeholder: 'Enter quantity',
        min: 1,
        value: item.quantity.toString()
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Update',
        handler: async (data) => {
          const newQuantity = parseInt(data.quantity, 10);
          if (isNaN(newQuantity) || newQuantity < 1) {
            this.showToast('Please enter a valid quantity');
            return false;
          }

          try {
            const response = await this.http.get<{quantity: number}>(
              `http://localhost/user_api/products.php?check_quantity=1&product_id=${productId}`
            ).toPromise();

            if (response && newQuantity <= response.quantity) {
              this.updateQuantity(productId, newQuantity);
              return true;
            } else {
              const availableQuantity = response ? response.quantity : 0;
              this.showToast(`Sorry, only ${availableQuantity} units are available for this product.`);
              return false;
            }
          } catch (error) {
            console.error(`Error checking quantity for product ${productId}:`, error);
            this.showToast('Error checking product availability. Please try again.');
            return false;
          }
        }
      }
    ]
  });

  await alert.present();
}

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  decreaseQuantity(productId: number) {
    const item = this.cartItems.find(i => i.product_id === productId);
    if (item && item.quantity > 1) {
      this.updateQuantity(productId, item.quantity - 1);
    } else if (item && item.quantity === 1) {
      // If the quantity is 1, removing the item instead of setting it to zero
      this.removeItem(productId);
    }
  }
  

  async increaseQuantity(productId: number) {
    const item = this.cartItems.find(i => i.product_id === productId);
    if (item) {
      try {
        const response = await this.http.get<{quantity: number}>(
          `http://localhost/user_api/products.php?check_quantity=1&product_id=${productId}`
        ).toPromise();
  
        if (response && item.quantity < response.quantity) {
          // There's still stock available, so we can increase the quantity
          this.updateQuantity(productId, item.quantity + 1);
        } else {
          // Show an alert or toast that max quantity has been reached
          const alert = await this.alertController.create({
            header: 'Maximum Quantity Reached',
            message: `Sorry, there are only ${response ? response.quantity : item.quantity} units available for this product.`,
            buttons: ['OK']
          });
          await alert.present();
        }
      } catch (error) {
        console.error(`Error checking quantity for product ${productId}:`, error);
        this.showToast('Error checking product availability. Please try again.');
      }
    }
  }

  loadSavedAddresses() {
  if (this.userId) {
    this.http.get<any[]>(`http://localhost/user_api/address.php?user_id=${this.userId}`)
      .pipe(
        catchError(error => {
          console.error('Error loading addresses:', error);
          this.showToast('Failed to load saved addresses');
          return of([]);
        })
      )
      .subscribe(
        (addresses) => {
          console.log('Addresses received:', addresses);
          this.savedAddresses = addresses;
        }
      );
  }
}
  
async addNewAddress() {
  const alert = await this.alertController.create({
    header: 'Add New Address',
    cssClass: 'address-alert',
    inputs: [
      {
        name: 'address_line1',
        type: 'text',
        placeholder: 'Address Line 1 *',
        cssClass: 'address-input'
      },
      {
        name: 'address_line2',
        type: 'text',
        placeholder: 'Address Line 2',
        cssClass: 'address-input'
      },
      {
        name: 'city',
        type: 'text',
        placeholder: 'City *',
        cssClass: 'address-input'
      },
      {
        name: 'province',
        type: 'text',
        placeholder: 'Province',
        cssClass: 'address-input'
      },
      {
        name: 'postal_code',
        type: 'text',
        placeholder: 'Postal Code',
        cssClass: 'address-input'
      },
      {
        name: 'country',
        type: 'text',
        placeholder: 'Country *',
        cssClass: 'address-input'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
        handler: () => {
          return true; // Dismiss the alert
        }
      },
      {
        text: 'Add',
        handler: (data) => {
          if (!data.address_line1 || !data.city || !data.country) {
            this.showErrorToast('Please fill in all required fields.');
            return false;
          }

          const newAddress = {
            user_id: this.userId,
            address_line1: data.address_line1,
            address_line2: data.address_line2,
            city: data.city,
            province: data.province,
            postal_code: data.postal_code,
            country: data.country
          };

          this.http.post('http://localhost/user_api/address.php', newAddress)
            .pipe(
              catchError(error => {
                console.error('Error adding address:', error);
                this.showErrorToast('Failed to add address');
                return throwError(error);
              })
            )
            .subscribe({
              next: (response: any) => {
                console.log('Server response:', response);
                if (response && (response.status === 201 || response.success)) {
                  this.showToast('Address added successfully');
                  this.loadSavedAddresses();
                } else {
                  this.showErrorToast('Failed to add address: ' + (response.message || 'Unknown error'));
                }
              }
            });

          return true;
        }
      }
    ]
  });

  await alert.present();
}

deleteAddress(addressId: number) {
  if (this.userId) {
    this.http.delete('http://localhost/user_api/address.php', {
      body: { address_id: addressId, user_id: this.userId },
      responseType: 'text'
    }).pipe(
      map(response => {
        try {
          return JSON.parse(response);
        } catch (e) {
          console.error('Error parsing response:', e);
          return { status: 200, message: 'Address might have been deleted successfully' };
        }
      }),
      catchError(this.handleError<any>('deleteAddress'))
    ).subscribe({
      next: (response: any) => {
        if (response && (response.status === 200 || response.message.includes('successfully'))) {
          this.showToast('Address deleted successfully');
          this.loadSavedAddresses();
        } else {
          this.showErrorToast('Failed to delete address');
        }
      }
    });
  }
}

private handleError<T>(operation = 'operation', result?: T) {
  return (error: any): Observable<T> => {
    console.error(`${operation} failed:`, error);
    
    // If the error is actually a successful response
    if (error instanceof HttpErrorResponse && error.status === 200) {
      try {
        const parsedResponse = JSON.parse(error.error.text);
        if (parsedResponse.status === 200 || parsedResponse.message.includes('successfully')) {
          return of(parsedResponse as T);
        }
      } catch (e) {
        console.error('Error parsing successful response:', e);
      }
    }

    // Let the app keep running by returning an empty result.
    return of(result as T);
  };
}

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'danger'
    });
    toast.present();
  }
  

  async checkProductQuantities(): Promise<{isValid: boolean, invalidItems: {name: string, availableQuantity: number}[]}> {
    const invalidItems: {name: string, availableQuantity: number}[] = [];
    let isValid = true;
  
    for (const item of this.cartItems) {
      try {
        const response = await this.http.get<{quantity: number}>(
          `http://localhost/user_api/products.php?check_quantity=1&product_id=${item.product_id}`
        ).toPromise();
  
        if (response && item.quantity > response.quantity) {
          isValid = false;
          invalidItems.push({name: item.name, availableQuantity: response.quantity});
        }
      } catch (error) {
        console.error(`Error checking quantity for product ${item.product_id}:`, error);
        // Assume invalid if we can't check
        isValid = false;
        invalidItems.push({name: item.name, availableQuantity: 0});
      }
    }
  
    return {isValid, invalidItems};
  }

  async PlaceOrder(): Promise<void> {
    try {
      if (this.cartItems.length === 0) {
        const alert = await this.alertController.create({
          header: 'Empty Cart',
          message: 'Your cart is empty. Add some items before placing an order.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }
  
      if (!this.userEmail) {
        this.showToast('User email not found. Please log in again.');
        return;
      }
  
      console.log('Starting order placement process');
  
      // Check product quantities
      const {isValid, invalidItems} = await this.checkProductQuantities();
      if (!isValid) {
        let message = 'The following items have insufficient quantity:\n';
        invalidItems.forEach(item => {
          message += `${item.name}: ${item.availableQuantity} available\n`;
        });
        const alert = await this.alertController.create({
          header: 'Insufficient Quantity',
          message: message,
          buttons: ['OK']
        });
        await alert.present();
        return;
      }
  
      // Generate PDF
      const pdf = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = pdf.internal.pageSize.width;

    // Set font
    pdf.setFont("helvetica", "normal");

    // Add header
    pdf.setFontSize(20);
    pdf.text("Invoice", pageWidth / 2, 20, { align: "center" });

    // Add order details
    pdf.setFontSize(12);
    const orderId = new Date().getTime().toString(); // Generate a unique order ID
    pdf.text(`Order ID: ${orderId}`, 20, 40);

    // Add customer details
    const customerName = sessionStorage.getItem('userName') || 'N/A';
    const customerSurname = sessionStorage.getItem('userSurname') || 'N/A';
    pdf.text(`Name: ${customerName} ${customerSurname}`, 20, 50);
    pdf.text(`Email: ${this.userEmail}`, 20, 60);

    // Add delivery address if applicable
    let yPos = 70;
    if (this.deliveryMethod === 'delivery' && this.selectedAddress) {
      pdf.text("Delivery Address:", 20, yPos);
      yPos += 10;
      pdf.text(this.selectedAddress.address_line1, 20, yPos);
      if (this.selectedAddress.address_line2) {
        yPos += 10;
        pdf.text(this.selectedAddress.address_line2, 20, yPos);
      }
      yPos += 10;
      pdf.text(`${this.selectedAddress.city}, ${this.selectedAddress.province} ${this.selectedAddress.postal_code}`, 20, yPos);
      yPos += 10;
      pdf.text(this.selectedAddress.country, 20, yPos);
      yPos += 20;
    } else {
      yPos += 10;
    }

    // Add order items table
    pdf.setFontSize(14);
    pdf.text("Order Items", 20, yPos);
    yPos += 10;

    const columns = ["Item", "Quantity", "Price", "Total"];
    const data = this.cartItems.map(item => [
      item.name,
      item.quantity.toString(),
      `R${item.price.toFixed(2)}`,
      `R${(item.price * item.quantity).toFixed(2)}`
    ]);

    pdf.autoTable({
      head: [columns],
      body: data,
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      margin: { top: 20 },
    });

    yPos = (pdf as any).lastAutoTable.finalY + 20;

    // Add price details
    pdf.setFontSize(12);
    pdf.text(`Subtotal: R${this.subtotal.toFixed(2)}`, pageWidth - 70, yPos);
    yPos += 10;
    pdf.text(`Discounted Subtotal: R${this.discountedSubtotal.toFixed(2)}`, pageWidth - 70, yPos);
    yPos += 10;
    pdf.text(`Tax (15%): R${this.tax.toFixed(2)}`, pageWidth - 70, yPos);
    yPos += 10;
    pdf.setFontSize(14);
    pdf.text(`Total: R${this.discountedTotal.toFixed(2)}`, pageWidth - 70, yPos);

    console.log('PDF generated');

    // Save PDF to a Blob
    const pdfBlob = pdf.output('blob');
  
      // Prepare the order data
      const orderData = {
        user_id: this.userId,
        total_amount: this.total,
        discounted_amount: this.discountedTotal,
        order_type: this.deliveryMethod,
        status: 'pending',
        items: this.cartItems,
        created_at: new Date()
      };
  
      console.log('Order data prepared:', JSON.stringify(orderData, null, 2));
  
      // Send the email with PDF Blob
      await this.sendOrderEmail(this.userEmail, pdfBlob);
  
      // Send order data to server
      const response = await this.http.post<{ success: boolean, message: string }>(
        'http://localhost/user_api/orders.php', 
        orderData
      ).toPromise();
  
      if (response && response.success) {
        const firestoreOrderId = new Date().getTime().toString();
        const firestoreOrderData = { ...orderData, firestore_order_id: firestoreOrderId };
        await this.firestore.collection('orders').doc(firestoreOrderId).set(firestoreOrderData);


        this.cartService.clearAllItems().subscribe({
          next: () => {
            console.log('Cart cleared successfully');
            // The cart will be automatically updated via the subscription
          },
          error: (error) => {
            console.error('Error clearing cart:', error);
            this.showToast('Failed to clear cart. Please try again.');
          }
        });

        const alert = await this.alertController.create({
          header: 'Order Placed',
          message: `Your order for R${this.total.toFixed(2)} has been placed successfully!`,
          buttons: ['OK']
        });
        await alert.present();
        this.cartService.clearCart();
        this.cartItems = [];
        this.calculateTotals();
      } else {
        throw new Error('Server response indicates failure');
      }
    } catch (error) {
      console.error('Error in order placement process:', error);
      this.showToast('An error occurred while placing your order. Please try again.');
    }
  }


// Function to send email with PDF order details
async sendOrderEmail(email: string, pdfBlob: Blob): Promise<void> {
    const loader = await this.loadingController.create({
        message: 'Sending Email...',
        cssClass: 'custom-loader-class'
    });
    await loader.present();

    const url = "http://localhost/Bestbrightness/src/send_email.php";
    const subject = "Order Details";
    const body = "Please find the attached order details PDF.";
    
    // Create FormData to send as POST request
    const formData = new FormData();
    formData.append('recipient', email);
    formData.append('subject', subject);
    formData.append('body', body);
    formData.append('pdf', pdfBlob, `Order_${new Date().getTime()}.pdf`); // Attach the PDF blob

    this.http.post(url, formData).subscribe(
        async (response) => {
            loader.dismiss();
            this.showToast('Email sent successfully!');
        },
        (error) => {
            loader.dismiss();
            console.error('Error sending email:', error);
            this.showToast('Failed to send email. Please try again.');
        }
    );
}

  
}
