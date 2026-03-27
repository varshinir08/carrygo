import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {UserForm} from './user-form/user-form';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,UserForm],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone:true
})
export class App {
  protected readonly title = signal('CarryGo-FrontEnd');
}
