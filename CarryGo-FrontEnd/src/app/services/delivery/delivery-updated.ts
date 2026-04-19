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

  /** Returns PENDING deliveries whose route matches the given porter's routes. */
  getMatchedDeliveries(porterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/matched/${porterId}`);
  }

  /** Returns the count of online porters that match the given coordinates. */
  getMatchingPortersCount(
    pickupLat?: number, pickupLng?: number,
    dropLat?: number,   dropLng?: number
  ): Observable<number> {
    let params: any = {};
    if (pickupLat != null) params['pickupLat'] = pickupLat;
    if (pickupLng != null) params['pickupLng'] = pickupLng;
    if (dropLat   != null) params['dropLat']   = dropLat;
    if (dropLng   != null) params['dropLng']   = dropLng;
    return this.http.get<number>(`${this.apiUrl}/matching-porters-count`, { params });
  }

  updateDeliveryStatus(deliveryId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${deliveryId}/status`, null, { params: { status } });
  }

  acceptDelivery(deliveryId: number, commuterId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${deliveryId}/accept`, null, { params: { commuterId } });
  }

  getDeliveryById(deliveryId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${deliveryId}`);
  }

  getCommuterDeliveries(commuterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/commuter/${commuterId}`);
  }

  /** Notify commuters matching the delivery details */
  matchCommuters(deliveryData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/match`, deliveryData);
  }

  /** Fetch personalized deliveries for a user */
  getPersonalizedDeliveries(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}/deliveries`);
  }

  /** Mark a delivery as completed */
  markDeliveryAsCompleted(deliveryId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${deliveryId}/status`, null, { params: { status: 'DELIVERED' } });
  }
}
