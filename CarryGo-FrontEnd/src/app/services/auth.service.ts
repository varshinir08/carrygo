import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8081/api/users';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
    }
  }

  private loadCurrentUser() {
    const user = this.getCurrentUserFromStorage();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, user).pipe(
      tap((response: any) => {
        console.log('Registration successful', response);
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials).pipe(
      tap((user: any) => {
        if (user && user.userId) {
          if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('userId', user.userId.toString());
            sessionStorage.setItem('userRole', user.role);
          }
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getCurrentUserFromStorage() {
    if (!this.isBrowser()) return null;
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  getCurrentUser() {
    return this.currentUserSubject.value;
  }

  getLoggedInUserEmail(): string | null {
    if (!this.isBrowser()) return null;
    return sessionStorage.getItem('userEmail');
  }

  getLoggedInUserId(): number | null {
    if (!this.isBrowser()) return null;
    const id = sessionStorage.getItem('userId');
    return id ? parseInt(id, 10) : null;
  }

  getUserRole(): string | null {
    if (!this.isBrowser()) return null;
    return sessionStorage.getItem('userRole');
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser()) return false;
    return !!sessionStorage.getItem('currentUser');
  }

  logout() {
    if (this.isBrowser()) {
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userRole');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
