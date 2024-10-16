import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = 'http://localhost/user_api/promotions.php'; // Adjust this URL as needed

  constructor(private http: HttpClient) { }

  getPromotions(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}