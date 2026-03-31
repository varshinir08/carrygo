import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { UserDashboard } from './user-dashboard/user-dashboard';
import { PorterDashboardComponent } from './modules/porter-homepage.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'user-dashboard', component: UserDashboard },
  { path: 'porter-dashboard', component: PorterDashboardComponent },
  { path: '**', redirectTo: '/login' }
];
