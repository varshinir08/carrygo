import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PorterProfile {
  userId: number;
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
  role: string;
  isOnline?: boolean;
}

export interface WalletData {
  walletId: number;
  userId: number;
  balance: number;
  lastUpdated: string;
}

export interface PorterStatus {
  userId: number;
  isOnline: boolean;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  getPorterProfileByEmail(email: string): Observable<PorterProfile> {
    return this.http.get<PorterProfile>(`${this.baseUrl}/users/email/${email}`);
  }

  getPorterProfileById(userId: number): Observable<PorterProfile> {
    return this.http.get<PorterProfile>(`${this.baseUrl}/users/${userId}`);
  }

  getWalletByUserId(userId: number): Observable<WalletData> {
    return this.http.get<WalletData>(`${this.baseUrl}/wallets/user/${userId}`);
  }

  updatePorterStatus(userId: number, isOnline: boolean): Observable<PorterProfile> {
    return this.http.put<PorterProfile>(`${this.baseUrl}/users/${userId}/status`, {
      is_online: isOnline
    });
  }

  getPorterDeliveries(userId: number, limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/deliveries/user/${userId}`);
  }

  getAvailableDeliveries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/deliveries/available`);
  }

  getPorterRatings(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/ratings/commuter/${userId}`);
  }

  updatePorterProfile(userId: number, profileData: Partial<PorterProfile>): Observable<PorterProfile> {
    return this.http.put<PorterProfile>(`${this.baseUrl}/users/${userId}`, profileData);
  }

  getAllUsers(): Observable<PorterProfile[]> {
    return this.http.get<PorterProfile[]>(`${this.baseUrl}/users`);
  }
}