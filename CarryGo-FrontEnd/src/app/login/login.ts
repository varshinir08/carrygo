import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common'; // Import CommonModule & Pipe
import { Router, RouterLink } from '@angular/router'; // Import Router & RouterLink
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true, // Ensure this is set to true
  imports: [FormsModule, TitleCasePipe, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginData = {
    email: '',
    password: '',
    role: 'user' // default role
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        // Navigate to the dashboard automatically
        this.router.navigate(['/user-dashboard']);
      },
      error: (err) => {
        alert('Login failed: ' + (err.error || 'Invalid credentials'));
      }
    });
  }
}
