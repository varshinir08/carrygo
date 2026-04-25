import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IntercityCourier {
  id: number;
  name: string;
  tagline: string;
  description: string;
  logoEmoji: string;
  bgColor: string;
  accentColor: string;
  basePrice: number;
  pricePerKg: number;
  estimatedDays: string;
  features: string[];
  categories: string[];
  rating: number;
  reviews: number;
  serviceUrl: string;
  cities: string[];
  isActive: boolean;
  badge: string | null;
}

@Injectable({ providedIn: 'root' })
export class IntercityService {
  private readonly base = 'http://localhost:8081/api/intercity';

  constructor(private http: HttpClient) {}

  getCouriers(): Observable<IntercityCourier[]> {
    return this.http.get<IntercityCourier[]>(`${this.base}/couriers`);
  }
}
