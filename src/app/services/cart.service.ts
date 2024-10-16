import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export interface newItems {
  cart_id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
}


@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost/user_api/cart.php';
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);

  constructor(private http: HttpClient) {
    this.loadCartFromServer();
  }

  private getUserId(): string | null {
    return sessionStorage.getItem('userId');
  }

  private loadCartFromServer() {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('User not logged in. Cannot load cart.');
      return;
    }

    const params = new HttpParams().set('user_id', userId);

    this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        if (response && response.data && Array.isArray(response.data)) {
          return response.data.map((item: any) => ({
            cart_id: parseInt(item.cart_id, 10),
            user_id: parseInt(item.user_id, 10),
            product_id: parseInt(item.product_id, 10),
            quantity: parseInt(item.quantity, 10),
            name: item.name || 'Unknown Product',
            price: parseFloat(item.price || '0'),
            image_url: item.image_url || ''
          }));
        } else {
          console.warn('Unexpected server response format:', response);
          return [];
        }
      }),
      catchError(this.handleError)
    ).subscribe({
      next: (items: CartItem[]) => {
        this.cartItems = items;
        this.cartItemsSubject.next(this.cartItems);
      },
      error: (error) => {
        console.error('Error loading cart from server:', error);
        this.loadCartFromStorage();
      }
    });
  }

  private loadCartFromStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      this.cartItems = JSON.parse(savedCart);
      this.cartItemsSubject.next(this.cartItems);
    }
  }

  addToCart(product: CartItem): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }

    const payload = {
      user_id: userId,
      product_id: product.product_id,
      quantity: 1
    };

    return this.http.post(this.apiUrl, payload).pipe(
      tap(() => {
        const existingItem = this.cartItems.find(item => item.product_id === product.product_id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          this.cartItems.push({ ...product, quantity: 1 });
        }
        this.updateCart();
      }),
      catchError(this.handleError)
    );
  }

  removeFromCart(productId: number): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }

    const params = new HttpParams()
      .set('user_id', userId)
      .set('product_id', productId.toString());

    return this.http.delete(this.apiUrl, { params }).pipe(
      tap(() => {
        this.cartItems = this.cartItems.filter(item => item.product_id !== productId);
        this.updateCart();
      }),
      catchError(this.handleError)
    );
  }

  updateQuantity(productId: number, quantity: number): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }

    const payload = {
      user_id: userId,
      product_id: productId,
      quantity: quantity
    };

    return this.http.put(this.apiUrl, payload).pipe(
      tap(() => {
        const item = this.cartItems.find(item => item.product_id === productId);
        if (item) {
          item.quantity = quantity;
        }
        this.updateCart();
      }),
      catchError(this.handleError)
    );
  }

  getCart(): Observable<CartItem[]> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }
  
    const params = new HttpParams().set('user_id', userId);
  
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        if (response && response.data && Array.isArray(response.data)) {
          return response.data.map((item: any) => ({
            product_id: item.product_id,
            name: item.name || 'Unknown Product',
            price: parseFloat(item.price?.toString() || '0'),
            quantity: parseInt(item.quantity?.toString() || '0', 10),
            image_url: item.image_url || ''
          }));
        } else {
          console.warn('Unexpected server response format:', response);
          return [];
        }
      }),
      catchError(this.handleError)
    );
  }
  
  

  getTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const price = item.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }

  getTax(): number {
    return this.getTotal() * 0.175; // Assuming 17.5% tax rate
  }

  clearCart(): Observable<any> {
    this.cartItems = [];
    return this.http.delete(this.apiUrl).pipe(
      tap(() => this.updateCart()),
      catchError(this.handleError)
    );
  }

  clearAllItems(): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }

    const params = new HttpParams()
      .set('user_id', userId)
      .set('clear_all', 'true');  // Add a parameter to indicate clearing all items

    return this.http.delete(this.apiUrl, { params }).pipe(
      tap(() => {
        this.cartItemsSubject.next([]);
      }),
      catchError(this.handleError)
    );
  }

  private updateCart() {
    this.cartItemsSubject.next(this.cartItems);
    localStorage.removeItem('cart'); // Remove cart from local storage
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && typeof error.error === 'object') {
        console.error('Full error response:', error.error);
        if (error.error.error) {
          errorMessage += `\nDetails: ${error.error.error}`;
        }
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}