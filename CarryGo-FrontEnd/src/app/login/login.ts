import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';   // ✅ import RouterLink
import { AuthService } from '../services/auth.service';

@Component({
selector: 'app-login',
standalone: true,
imports: [FormsModule, TitleCasePipe, RouterLink],   // ✅ add RouterLink here
templateUrl: './login.html',
styleUrls: ['./login.css']
})
export class Login {
loginData = { email: '', password: '', role: 'user' };

constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      alert('Please fill in all required fields.');
      return;
    }

    this.authService.login(this.loginData).subscribe({
      next: () => {
        alert(`Login successful as ${this.loginData.role}`);
        this.router.navigate(['/register']); // ✅ or redirect somewhere else
      },
      error: () => alert('Invalid credentials')
    });
  }
}
