import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { UserDashboard } from './user-dashboard/user-dashboard';
import { PorterDashboardComponent } from './homepage-porter/porter-homepage';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'user-dashboard', component: UserDashboard, canActivate: [AuthGuard] },
  { path: 'porter-dashboard', component: PorterDashboardComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];
