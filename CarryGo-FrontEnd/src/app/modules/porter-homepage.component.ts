import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user-service';
import { AuthService } from '../services/auth.service';

interface PorterProfile {
  userId: number;
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
  role: string;
  isOnline?: boolean;
}

interface WalletData {
  wallet_id: number;
  balance: number;
  last_updated: string;
}

interface NavItem {
  label: string;
  icon: string;
  route: string;
  active: boolean;
}

@Component({
  selector: 'porter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './porter-homepage.component.html',
  styleUrls: ['./porter-homepage.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class PorterDashboardComponent implements OnInit {
  // User data from database
  porterProfile: PorterProfile | null = null;
  walletData: WalletData | null = null;
  
  // UI state
  isOnline: boolean = false;
  earningsToday: number = 0;
  notifications: number = 3;
  currentTheme: 'light' | 'dark' = 'light';
  userInitials: string = '';
  errorMessage: string = '';
  showProfileDropdown: boolean = false;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard', active: false },
    { label: 'Deliveries', icon: '🚚', route: '/deliveries', active: false },
    { label: 'KYC Verification', icon: '✓', route: '/kyc', active: false },
    { label: 'Profile', icon: '👤', route: '/profile', active: false }
  ];

  quickActions = [
    { title: 'New Deliveries', color: 'emerald', icon: '📍', route: '/new-deliveries', desc: 'Check available deliveries' },
    { title: 'Route Planner', color: 'orange', icon: '🗺️', route: '/route-planner', desc: 'Plan your route' },
    { title: 'Active Task', color: 'blue', icon: '⚡', route: '/active-task', desc: 'View current task' }
  ];

  services = [
    { title: 'Intracity Delivery', desc: 'Fast and reliable delivery within city limits', icon: '🚗', highlight: '#10B981' },
    { title: 'Intercity Delivery', desc: 'Long-distance hauling between cities with premium rates', icon: '🛣️', highlight: '#F59E0B' },
    { title: 'Commuter Service', desc: 'On-route flexible delivery while commuting', icon: '🚌', highlight: '#3B82F6' }
  ];

  about = {
    mission: 'Fast & Reliable Delivery - CarryGo connects you with opportunities across the city and beyond.'
  };

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPorterData();
    this.loadThemePreference();
    this.setActiveNavItem();
  }

  /**
   * Load porter profile and wallet data from database using login details
   */
  loadPorterData(): void {
    this.errorMessage = '';
    
    // Get logged-in user's email from auth service
    const userEmail = this.authService.getLoggedInUserEmail();
    
    if (!userEmail) {
      this.errorMessage = 'Please login to continue';
      this.router.navigate(['/login']);
      return;
    }

    // Fetch user profile from database
    this.userService.getPorterProfileByEmail(userEmail).subscribe({
      next: (profile: PorterProfile) => {
        this.porterProfile = profile;
        this.isOnline = profile.isOnline ?? false;
        this.generateUserInitials(profile.name);
        this.loadWalletData(profile.userId);
      },
      error: (error) => {
        console.error('Error loading porter profile:', error);
        this.errorMessage = 'Failed to load porter profile';
      }
    });
  }

  /**
   * Load wallet data for earnings display
   */
  loadWalletData(userId: number): void {
    this.userService.getWalletByUserId(userId).subscribe({
      next: (wallet: WalletData) => {
        this.walletData = wallet;
        this.earningsToday = wallet.balance;
      },
      error: (error) => {
        console.error('Error loading wallet data:', error);
        this.earningsToday = 0;
      }
    });
  }

  /**
   * Generate initials from full name
   */
  generateUserInitials(fullName: string): void {
    const nameParts = fullName.trim().split(' ');
    this.userInitials = nameParts
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Toggle online/offline status - update in database
   */
  toggleStatus(): void {
    this.isOnline = !this.isOnline;
    
    if (this.porterProfile) {
      this.userService.updatePorterStatus(this.porterProfile.userId, this.isOnline).subscribe({
        next: (response) => {
          console.log('Status updated successfully:', response);
          // Update the profile with the new status from backend
          if (response.isOnline !== undefined) {
            this.isOnline = response.isOnline;
          }
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.isOnline = !this.isOnline; // Revert on error
        }
      });
    }
  }

  /**
   * Toggle theme preference
   */
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('porterTheme', this.currentTheme);
    const hostElement = document.querySelector('porter-dashboard') as HTMLElement;
    if (hostElement) {
      hostElement.setAttribute('data-theme', this.currentTheme);
    }
  }

  /**
   * Load theme preference from localStorage
   */
  loadThemePreference(): void {
    const savedTheme = localStorage.getItem('porterTheme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.currentTheme = savedTheme;
      const hostElement = document.querySelector('porter-dashboard') as HTMLElement;
      if (hostElement) {
        hostElement.setAttribute('data-theme', this.currentTheme);
      }
    }
  }

  /**
   * Set active navigation item based on current route
   */
  setActiveNavItem(): void {
    const currentRoute = this.router.url;
    this.navItems.forEach(item => {
      item.active = item.route === currentRoute;
    });
  }

  /**
   * Set active navigation item
   */
  setActiveNav(item: NavItem): void {
    this.navItems.forEach(i => i.active = false);
    item.active = true;
  }

  /**
   * Toggle user profile dropdown
   */
  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  /**
   * Close profile dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const profileSection = document.querySelector('.profile-section') as HTMLElement;
    if (profileSection && !profileSection.contains(event.target as Node)) {
      this.showProfileDropdown = false;
    }
  }

  /**
   * View full profile
   */
  viewProfile(): void {
    this.router.navigate(['/profile']);
    this.showProfileDropdown = false;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
