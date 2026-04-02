import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginData = {
    email: '',
    password: '',
    role: 'user'
  };

  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Email and password are required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.isLoading = false;

        // Use the response directly instead of getCurrentUser()
        if (response && response.userId) {
          console.log('User role:', response.role);
          
          // Route based on role from response
          if (response.role === 'porter' || response.role === 'commuter') {
            console.log('Routing to porter-dashboard');
            this.router.navigate(['/porter-dashboard']);
          } else {
            console.log('Routing to user-dashboard');
            this.router.navigate(['/user-dashboard']);
          }
        } else {
          this.errorMessage = 'Login successful but user data not found';
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login error:', err);
        this.errorMessage = err.error?.message || 'Invalid email or password';
      }
    });
  }

  switchRole() {
    this.loginData.role = this.loginData.role === 'user' ? 'porter' : 'user';
  }
}
