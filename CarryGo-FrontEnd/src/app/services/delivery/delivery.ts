import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Delivery {
  private apiUrl = 'http://localhost:8081/api/deliveries';

  constructor(private http: HttpClient) {}

  createDelivery(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getUserDeliveries(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }

  getAvailableDeliveries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available`);
  }

  updateDeliveryStatus(deliveryId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${deliveryId}/status`, { status });
  }
}
