import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-commuter-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commuter-register.html',
  styleUrl: './commuter-register.css',
})
export class CommuterRegisterComponent implements OnInit {
  user: any = {};

  isSubmitting = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const u = this.authService.getCurrentUser();
    if (!u) { this.router.navigate(['/login']); return; }
    this.user = u;
    // If already a commuter, skip straight to dashboard
    if (this.isCommuter()) {
      this.router.navigate(['/porter-dashboard', this.user.userId]);
    }
  }

  isCommuter(): boolean {
    const role: string = this.user?.role ?? '';
    return role.split(',').map((r: string) => r.trim().toLowerCase()).includes('porter');
  }

  submit(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMsg = '';

    this.http.post(`http://localhost:8081/api/users/${this.user.userId}/register-commuter`, {}).pipe(
      timeout(10000)  // fail after 10 s so the button never stays stuck
    ).subscribe({
      next: (updatedUser: any) => {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        localStorage.setItem('userRole', updatedUser.role);
        this.isSubmitting = false;
        this.cdr.detectChanges();
        this.router.navigate(['/porter-dashboard', updatedUser.userId]);
      },
      error: (err: any) => {
        console.error('Commuter registration error', err);
        this.errorMsg = err?.status === 0
          ? 'Cannot reach server. Is the backend running?'
          : 'Registration failed. Please try again.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/user-dashboard', this.user.userId]);
  }
}
