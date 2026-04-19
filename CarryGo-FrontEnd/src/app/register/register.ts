import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

constructor(private authService: AuthService) {}

  onSubmit() {
    if (this.user.password !== this.user.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!this.user.agree) {
      alert('You must agree to the terms before registering.');
      return;
    }

    this.authService.register(this.user).subscribe({
      next: () => alert('Registration successful'),
      error: () => alert('Registration failed')
    });
  }
}
