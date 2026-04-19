import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user-service';

interface PorterProfile {
  userId: number;
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
  role: string;
  isOnline?: boolean;
}

interface Rating {
  ratingId: number;
  rating: number;
  comment: string;
  createdAt: string;
  senderId?: number;
}

interface Delivery {
  deliveryId: number;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface EditPersonalForm {
  name: string;
  phone: string;
  email: string;
}

interface EditVehicleForm {
  vehicleModel: string;
  vehicleNumber: string;
  vehicleType: string;
  licenceNumber: string;
  licenceExpiry: string;
}

@Component({
  selector: 'porter-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './porter-profile.html',
  styleUrls: ['./porter-profile.css']
})
export class PorterProfileComponent implements OnInit {

  // Header state
  userInitials = '';
  isOnline = false;
  isToggling = false;
  statusToast = '';
  earningsToday = 0;
  showProfileDropdown = false;

  // Profile data
  profile: PorterProfile | null = null;
  ratings: Rating[] = [];
  deliveries: Delivery[] = [];
  walletBalance = 0;

  // Computed stats
  totalDeliveries = 0;
  avgRating = 0;
  thisMonthEarnings = 0;
  completionRate = 0;
  totalReviews = 0;
  starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Edit modals
  showEditPersonal = false;
  showEditVehicle = false;
  isSavingPersonal = false;
  isSavingVehicle = false;
  saveSuccess = '';

  editPersonal: EditPersonalForm = { name: '', phone: '', email: '' };
  editVehicle: EditVehicleForm  = { vehicleModel: '', vehicleNumber: '', vehicleType: '', licenceNumber: '', licenceExpiry: '' };

  vehicleTypes = ['2-wheeler', '3-wheeler', '4-wheeler', 'Bicycle'];

  // Preferences (local UI state, persisted in localStorage)
  prefs = {
    orderNotifications: true,
    earningsAlerts: true,
    autoAccept: false,
    flexibleSchedule: true,
  };

  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) { this.router.navigate(['/login']); return; }
    this.loadPrefs();

    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (p: PorterProfile) => {
        this.profile = p;
        this.isOnline = p.isOnline ?? false;
        this.generateInitials(p.name);
        this.loadAllData(p.userId);
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  loadAllData(userId: number): void {
    forkJoin({
      wallet:    this.userService.getWalletByUserId(userId),
      ratings:   this.http.get<Rating[]>(`${this.apiBase}/ratings/commuter/${userId}`),
      deliveries: this.http.get<Delivery[]>(`${this.apiBase}/deliveries/commuter/${userId}`)
    }).subscribe({
      next: ({ wallet, ratings, deliveries }) => {
        this.walletBalance   = (wallet as any).balance ?? 0;
        this.earningsToday   = this.walletBalance;
        this.ratings         = ratings;
        this.deliveries      = deliveries;
        this.computeStats();
      },
      error: () => {
        // partial data — compute what we have
        this.computeStats();
      }
    });
  }

  computeStats(): void {
    // Deliveries
    this.totalDeliveries = this.deliveries.length;
    const delivered = this.deliveries.filter(d => d.status === 'DELIVERED');
    this.completionRate = this.totalDeliveries > 0
      ? Math.round((delivered.length / this.totalDeliveries) * 100) : 0;

    // This month earnings from wallet balance
    this.thisMonthEarnings = this.walletBalance;

    // Ratings
    this.totalReviews = this.ratings.length;
    this.starCounts   = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.ratings.forEach(r => {
      const s = Math.min(5, Math.max(1, r.rating));
      this.starCounts[s] = (this.starCounts[s] || 0) + 1;
    });
    this.avgRating = this.totalReviews > 0
      ? Math.round((this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.totalReviews) * 10) / 10
      : 0;
  }

  get isKycVerified(): boolean {
    return !!(
      this.profile?.vehicleType &&
      this.profile?.vehicleNumber &&
      this.profile?.vehicleModel &&
      this.profile?.licenceNumber &&
      this.profile?.licenceExpiry
    );
  }

  starBarPct(star: number): number {
    if (!this.totalReviews) return 0;
    return Math.round((this.starCounts[star] / this.totalReviews) * 100);
  }

  starArray(n: number): number[] { return Array(Math.round(n)).fill(0); }
  emptyStars(n: number): number[] { return Array(5 - Math.round(n)).fill(0); }

  getMemberSince(): string {
    // Use the smallest delivery createdAt as a proxy, or fall back to current year
    if (this.deliveries.length) {
      const oldest = this.deliveries.reduce((a, b) =>
        new Date(a.createdAt) < new Date(b.createdAt) ? a : b);
      const d = new Date(oldest.createdAt);
      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }
    return 'Jan 2024';
  }

  // ── Edit Personal ─────────────────────────────────────────────────────────
  openEditPersonal(): void {
    if (!this.profile) return;
    this.editPersonal = { name: this.profile.name, phone: this.profile.phone, email: this.profile.email };
    this.showEditPersonal = true;
  }

  savePersonal(): void {
    if (!this.profile) return;
    this.isSavingPersonal = true;
    this.http.put<PorterProfile>(`${this.apiBase}/users/${this.profile.userId}`, {
      name: this.editPersonal.name,
      phone: this.editPersonal.phone
    }).subscribe({
      next: (updated) => {
        if (this.profile) {
          this.profile.name  = this.editPersonal.name;
          this.profile.phone = this.editPersonal.phone;
          this.generateInitials(this.profile.name);
        }
        this.isSavingPersonal   = false;
        this.showEditPersonal   = false;
        this.showSaveSuccess('Personal details updated!');
      },
      error: () => { this.isSavingPersonal = false; }
    });
  }

  // ── Edit Vehicle ──────────────────────────────────────────────────────────
  openEditVehicle(): void {
    if (!this.profile) return;
    this.editVehicle = {
      vehicleModel:  this.profile.vehicleModel  ?? '',
      vehicleNumber: this.profile.vehicleNumber ?? '',
      vehicleType:   this.profile.vehicleType   ?? '',
      licenceNumber: this.profile.licenceNumber ?? '',
      licenceExpiry: this.profile.licenceExpiry ?? ''
    };
    this.showEditVehicle = true;
  }

  saveVehicle(): void {
    if (!this.profile) return;
    this.isSavingVehicle = true;
    this.http.put<PorterProfile>(`${this.apiBase}/users/${this.profile.userId}`, {
      vehicleType:   this.editVehicle.vehicleType,
      vehicleModel:  this.editVehicle.vehicleModel,
      vehicleNumber: this.editVehicle.vehicleNumber,
      licenceNumber: this.editVehicle.licenceNumber,
      licenceExpiry: this.editVehicle.licenceExpiry
    }).subscribe({
      next: () => {
        if (this.profile) {
          this.profile.vehicleModel  = this.editVehicle.vehicleModel;
          this.profile.vehicleNumber = this.editVehicle.vehicleNumber;
          this.profile.vehicleType   = this.editVehicle.vehicleType;
          this.profile.licenceNumber = this.editVehicle.licenceNumber;
          this.profile.licenceExpiry = this.editVehicle.licenceExpiry;
        }
        this.isSavingVehicle   = false;
        this.showEditVehicle   = false;
        this.showSaveSuccess('Vehicle details updated!');
      },
      error: () => { this.isSavingVehicle = false; }
    });
  }

  showSaveSuccess(msg: string): void {
    this.saveSuccess = msg;
    setTimeout(() => this.saveSuccess = '', 3000);
  }

  // ── Preferences ───────────────────────────────────────────────────────────
  loadPrefs(): void {
    const stored = localStorage.getItem('porterPrefs');
    if (stored) this.prefs = { ...this.prefs, ...JSON.parse(stored) };
  }

  savePref(key: keyof typeof this.prefs, value: boolean): void {
    (this.prefs as any)[key] = value;
    localStorage.setItem('porterPrefs', JSON.stringify(this.prefs));
  }

  // ── Header ────────────────────────────────────────────────────────────────
  toggleStatus(): void {
    if (!this.profile || this.isToggling) return;
    this.isToggling = true;
    this.isOnline = !this.isOnline;
    this.statusToast = this.isOnline ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; }, 600);
    setTimeout(() => { this.statusToast = ''; }, 2800);
    this.userService.updatePorterStatus(this.profile.userId, this.isOnline).subscribe({
      error: () => { this.isOnline = !this.isOnline; }
    });
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
  }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; }

  closeModals(): void { this.showEditPersonal = false; this.showEditVehicle = false; }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeModals(); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = document.querySelector('.profile-section');
    if (el && !el.contains(event.target as Node)) this.showProfileDropdown = false;
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
