import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
selector: 'app-register',
standalone: true,
imports: [FormsModule, RouterLink, NgIf],
templateUrl: './register.html',
styleUrls: ['./register.css']
})
export class Register {
user = {
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
  password: '',
  confirmPassword: '',
  role: 'user',
  agree: false
};

constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (this.user.password !== this.user.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!this.user.agree) {
      alert('You must agree to the terms before registering.');
      return;
    }

    const payload = {
      name: this.user.name.trim(),
      email: this.user.email.trim(),
      phone: `${this.user.countryCode}${this.user.phone.trim()}`,
      password: this.user.password,
      role: this.user.role
    };

    this.authService.register(payload).subscribe({
      next: () => {
        alert('Registration successful');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Registration failed', err);
        alert(err?.error || 'Registration failed');
      }
    });
  }
}
