import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user-service';
import { PorterStatusService } from '../services/porter-status.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Delivery {
  deliveryId: number;
  pickupAddress: string;
  dropAddress: string;
  packageType: string;
  totalAmount: number;
  distanceKm: number;
  status: string;
  createdAt: string;
  commuterId: number | null;
}

interface PorterProfile {
  userId: number;
  name: string;
  email: string;
  vehicleType?: string;
  isOnline?: boolean;
}

interface WalletData {
  balance: number;
}

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'porter-deliveries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './porter-deliveries.html',
  styleUrls: ['./porter-deliveries.css']
})
export class PorterDeliveriesComponent implements OnInit {
  porterProfile: PorterProfile | null = null;
  userInitials: string = '';
  get isOnline(): boolean { return this.statusService.isOnline; }
  isToggling: boolean = false;
  statusToast: string = '';
  earningsToday: number = 0;
  showProfileDropdown: boolean = false;
  showNotifPanel: boolean = false;
  orderRequests: any[] = [];
  notificationCount: number = 0;

  allDeliveries: Delivery[] = [];
  filteredDeliveries: Delivery[] = [];
  searchQuery: string = '';
  activeFilter: FilterTab = 'all';
  deliveriesLoaded: boolean = false;

  counts = { all: 0, active: 0, completed: 0, cancelled: 0 };

  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private statusService: PorterStatusService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) { this.router.navigate(['/login']); return; }

    // Use userId from URL immediately so data loads in parallel with the profile fetch
    const paramId = this.route.snapshot.paramMap.get('userId');
    if (paramId) {
      const uid = +paramId;
      this.loadWallet(uid);
      this.loadDeliveries(uid);
    }

    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (profile: PorterProfile) => {
        this.porterProfile = profile;
        this.statusService.init(profile.userId);
        this.generateInitials(profile.name);
        this.loadPendingOrders(profile.userId);
        this.cdr.detectChanges();
        if (!paramId) {
          this.loadWallet(profile.userId);
          this.loadDeliveries(profile.userId);
        }
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  loadWallet(userId: number): void {
    this.userService.getWalletByUserId(userId).subscribe({
      next: (w: WalletData) => {
        this.earningsToday = w.balance ?? 0;
        this.cdr.detectChanges();
      }
    });
  }

  loadDeliveries(userId: number): void {
    this.deliveriesLoaded = false;
    this.http.get<Delivery[]>(`${this.apiBase}/deliveries/commuter/${userId}`).subscribe({
      next: (deliveries) => {
        this.allDeliveries = deliveries;
        this.rebuildCounts();
        this.applyFilter();
        this.deliveriesLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deliveriesLoaded = true;
        this.cdr.detectChanges();
      }
    });
  }

  rebuildCounts(): void {
    this.counts.all       = this.allDeliveries.length;
    this.counts.active    = this.allDeliveries.filter(d => this.isActive(d)).length;
    this.counts.completed = this.allDeliveries.filter(d => d.status === 'DELIVERED').length;
    this.counts.cancelled = this.allDeliveries.filter(d => d.status === 'CANCELLED' || d.status === 'REJECTED').length;
  }

  setFilter(tab: FilterTab): void {
    this.activeFilter = tab;
    this.applyFilter();
  }

  applyFilter(): void {
    let list = this.allDeliveries;

    switch (this.activeFilter) {
      case 'active':    list = list.filter(d => this.isActive(d)); break;
      case 'completed': list = list.filter(d => d.status === 'DELIVERED'); break;
      case 'cancelled': list = list.filter(d => d.status === 'CANCELLED' || d.status === 'REJECTED'); break;
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.pickupAddress.toLowerCase().includes(q) ||
        d.dropAddress.toLowerCase().includes(q) ||
        this.formatOrderId(d.deliveryId).toLowerCase().includes(q)
      );
    }

    this.filteredDeliveries = list;
  }

  onSearch(): void { this.applyFilter(); }

  isActive(d: Delivery): boolean {
    return d.status === 'ACCEPTED' || d.status === 'ARRIVED_AT_PICKUP' || d.status === 'PICKED_UP';
  }

  get activeDeliveries(): Delivery[] {
    return this.filteredDeliveries.filter(d => this.isActive(d));
  }

  get pastDeliveries(): Delivery[] {
    return this.filteredDeliveries.filter(d => !this.isActive(d));
  }

  formatOrderId(id: number): string {
    return `CG-${new Date().getFullYear()}-${id.toString().padStart(3, '0')}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (d.getTime() === today.getTime())     return `Today, ${time}`;
    if (d.getTime() === yesterday.getTime()) return `Yesterday, ${time}`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + `, ${time}`;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'ACCEPTED':          'Accepted',
      'ARRIVED_AT_PICKUP': 'Arrived',
      'PICKED_UP':         'In transit',
      'DELIVERED':         'Delivered',
      'CANCELLED':         'Cancelled'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'ACCEPTED':          'status-pending',
      'ARRIVED_AT_PICKUP': 'status-transit',
      'PICKED_UP':         'status-transit',
      'DELIVERED':         'status-delivered',
      'CANCELLED':         'status-cancelled'
    };
    return map[status] ?? '';
  }

  getIconType(status: string): 'truck' | 'clock' | 'check' | 'cancel' {
    if (status === 'PICKED_UP' || status === 'ARRIVED_AT_PICKUP') return 'truck';
    if (status === 'ACCEPTED') return 'clock';
    if (status === 'DELIVERED') return 'check';
    return 'cancel';
  }

  toggleStatus(): void {
    if (!this.porterProfile || this.isToggling) return;
    this.isToggling = true;
    const next = !this.isOnline;
    this.statusService.set(next);
    this.statusToast = next ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; this.cdr.detectChanges(); }, 600);
    setTimeout(() => { this.statusToast = ''; this.cdr.detectChanges(); }, 2800);
    if (next) {
      this.loadDeliveries(this.porterProfile.userId);
      this.loadWallet(this.porterProfile.userId);
    }
    this.userService.updatePorterStatus(this.porterProfile.userId, next).subscribe({
      error: () => { this.statusService.set(!next); }
    });
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; this.showNotifPanel = false; }

  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; this.showProfileDropdown = false; }

  loadPendingOrders(userId: number): void {
    this.http.get<any[]>(`${this.apiBase}/deliveries/matched/${userId}`)
      .pipe(catchError(() => of([] as any[])))
      .subscribe(orders => {
        this.orderRequests = orders.filter((o: any) => o.pickupAddress?.trim() && o.dropAddress?.trim());
        this.notificationCount = this.orderRequests.length;
        this.cdr.detectChanges();
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = document.querySelector('.profile-section');
    if (el && !el.contains(event.target as Node)) this.showProfileDropdown = false;
    const notifEl = document.querySelector('.notif-wrap');
    if (notifEl && !notifEl.contains(event.target as Node)) this.showNotifPanel = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
