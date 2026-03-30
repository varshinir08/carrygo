import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class Delivery {
   private apiUrl = 'http://localhost:8081/api/deliveries';

    constructor(private http: HttpClient) {}

    createDelivery(data: any) {
      return this.http.post(this.apiUrl, data);
    }

    getUserDeliveries(userId: number) {
      return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
    }}
