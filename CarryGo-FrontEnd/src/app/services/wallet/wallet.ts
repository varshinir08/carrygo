import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Wallet {
  private apiUrl = 'http://localhost:8081/api/wallets';

  constructor(private http: HttpClient) {}

  getWalletByUserId(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`);
  }

  getBalance(userId: number): Observable<any> {
    return this.getWalletByUserId(userId);
  }
}
