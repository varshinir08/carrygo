import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PorterGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const role = (this.authService.getUserRole() ?? '').toLowerCase();
    const roles = role.split(',').map(r => r.trim());
    const isPorter = roles.includes('porter') || roles.includes('commuter');

    if (isPorter) {
      return true;
    }

    const userId = this.authService.getLoggedInUserId();
    this.router.navigate(userId ? ['/user-dashboard', userId] : ['/user-dashboard']);
    return false;
  }
}
