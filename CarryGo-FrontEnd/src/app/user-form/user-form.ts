import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient,HttpClientModule} from '@angular/common/http';
@Component({
  selector: 'app-user-form',
  imports: [FormsModule,HttpClientModule],
  standalone:true,
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm {
  user = {
      name: '',
      email: '',
      phone: '',
      password: ''
    };

    constructor(private http: HttpClient) {}

      onSubmit() {
        this.http.post('http://localhost:8081/api/users', this.user)
          .subscribe({
            next: (res) => {
              console.log(res);
              alert("User saved in DB!");
            },
            error: (err) => {
              console.error(err);
              alert("Error saving user");
            }
          });
      }
  }

