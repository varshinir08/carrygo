import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient) {}

  register(user: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, user);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials).pipe(
      tap((user: any) => {
        // This saves the User object (including userId) to the browser's memory
        if (user && user.userId) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      })
    );
  }

  // Helper to get the logged-in user's data anywhere in the app
  getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  logout() {
    localStorage.removeItem('currentUser');
  }
}
