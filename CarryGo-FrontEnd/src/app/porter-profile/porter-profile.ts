import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user-service';
import { PorterStatusService } from '../services/porter-status.service';

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
  get isOnline(): boolean { return this.statusService.isOnline; }
  isToggling = false;
  statusToast = '';
  earningsToday = 0;
  showProfileDropdown = false;

  // Profile data
  profile: PorterProfile | null = null;
  deliveries: Delivery[] = [];
  walletBalance = 0;

  // Computed stats
  totalDeliveries = 0;
  thisMonthEarnings = 0;
  completionRate = 0;

  // Edit modals
  showEditPersonal = false;
  showEditVehicle = false;
  isSavingPersonal = false;
  isSavingVehicle = false;
  saveSuccess = '';
  saveError = '';

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
    private route: ActivatedRoute,
    private http: HttpClient,
    private statusService: PorterStatusService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) { this.router.navigate(['/login']); return; }
    this.loadPrefs();

    // Fire stats/data fetch immediately using userId from URL
    const paramId = this.route.snapshot.paramMap.get('userId');
    if (paramId) {
      this.loadAllData(+paramId);
    }

    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (p: PorterProfile) => {
        this.profile = p;
        this.statusService.init(p.userId);
        this.generateInitials(p.name);
        this.cdr.detectChanges();
        if (!paramId) {
          this.loadAllData(p.userId);
        }
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  loadAllData(userId: number): void {
    forkJoin({
      wallet:     this.userService.getWalletByUserId(userId).pipe(catchError(() => of({ balance: 0 }))),
      deliveries: this.http.get<Delivery[]>(`${this.apiBase}/deliveries/commuter/${userId}`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ wallet, deliveries }) => {
        this.walletBalance = (wallet as any).balance ?? 0;
        this.deliveries    = deliveries as Delivery[];
        this.computeStats();
        this.cdr.detectChanges();
      }
    });
  }

  computeStats(): void {
    const now = new Date();

    this.totalDeliveries = this.deliveries.length;
    const delivered = this.deliveries.filter(d => (d.status || '').toUpperCase() === 'DELIVERED');
    this.completionRate = this.totalDeliveries > 0
      ? Math.round((delivered.length / this.totalDeliveries) * 100) : 0;

    this.earningsToday = delivered
      .filter(d => new Date(d.createdAt).toDateString() === now.toDateString())
      .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    this.thisMonthEarnings = delivered
      .filter(d => {
        const date = new Date(d.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, d) => sum + (d.totalAmount || 0), 0);
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
    this.saveError = '';
    this.showEditPersonal = true;
  }

  savePersonal(): void {
    if (!this.profile) return;
    this.isSavingPersonal = true;
    this.saveError = '';
    this.http.put<PorterProfile>(`${this.apiBase}/users/${this.profile.userId}`, {
      name: this.editPersonal.name,
      phone: this.editPersonal.phone
    }).subscribe({
      next: () => {
        this.userService.getPorterProfileById(this.profile!.userId).subscribe(p => {
          this.profile = p;
          this.generateInitials(p.name);
          this.isSavingPersonal = false;
          this.showEditPersonal = false;
          this.showSaveSuccess('Personal details updated!');
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.isSavingPersonal = false;
        this.saveError = 'Failed to save. Please try again.';
        this.cdr.detectChanges();
      }
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
    this.saveError = '';
    this.showEditVehicle = true;
  }

  saveVehicle(): void {
    if (!this.profile) return;
    this.isSavingVehicle = true;
    this.saveError = '';
    this.http.put<PorterProfile>(`${this.apiBase}/users/${this.profile.userId}`, {
      vehicleType:   this.editVehicle.vehicleType,
      vehicleModel:  this.editVehicle.vehicleModel,
      vehicleNumber: this.editVehicle.vehicleNumber,
      licenceNumber: this.editVehicle.licenceNumber,
      licenceExpiry: this.editVehicle.licenceExpiry
    }).subscribe({
      next: () => {
        this.userService.getPorterProfileById(this.profile!.userId).subscribe(p => {
          this.profile = p;
          this.generateInitials(p.name);
          this.isSavingVehicle = false;
          this.showEditVehicle = false;
          this.showSaveSuccess('Vehicle details updated!');
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.isSavingVehicle = false;
        this.saveError = 'Failed to save. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  showSaveSuccess(msg: string): void {
    this.saveSuccess = msg;
    setTimeout(() => { this.saveSuccess = ''; this.cdr.detectChanges(); }, 3000);
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
    const next = !this.isOnline;
    this.statusService.set(next);
    this.statusToast = next ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; this.cdr.detectChanges(); }, 600);
    setTimeout(() => { this.statusToast = ''; this.cdr.detectChanges(); }, 2800);
    this.userService.updatePorterStatus(this.profile.userId, next).subscribe({
      error: () => { this.statusService.set(!next); this.cdr.detectChanges(); }
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
