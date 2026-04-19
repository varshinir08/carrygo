import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  HostListener, Inject, PLATFORM_ID, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { NotificationsService, AppNotification } from '../services/notifications.service';
import { Delivery } from '../services/delivery/delivery';
import { Wallet } from '../services/wallet/wallet';
import { UserService } from '../services/user-service';
import { MapPickerComponent, MapPickerResult } from '../map-picker/map-picker';
import { forkJoin, interval, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

const TXN_KEY = 'carrygo_wallet_txns';

interface WalletTxn {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  method: string;
  date: string;
}

type ActiveSection = 'home' | 'deliveries' | 'wallet' | 'services';
type PackageType   = 'documents' | 'electronics' | 'clothing' | 'fragile' | 'food' | 'other';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapPickerComponent],
  templateUrl: './user-dashboard.html',
  styleUrl:    './user-dashboard.css',
})
export class UserDashboard implements OnInit, OnDestroy {

  /* ── User & data ── */
  user: any = {};
  deliveries: any[] = [];
  wallet: any = { balance: 0 };

  /* ── Section nav ── */
  activeSection: ActiveSection = 'home';

  /* ── Delivery form ── */
  pickupAddress        = '';
  pickupLat?: number;
  pickupLng?: number;
  dropAddress          = '';
  dropLat?: number;
  dropLng?: number;
  packageType: PackageType | '' = '';
  weightKg             = 1;
  receiverName         = '';
  receiverPhone        = '';
  specialInstructions  = '';

  /* ── Price estimate ── */
  showPriceCard   = false;
  estimatedDist   = 0;
  estimatedPrice  = 0;
  basePrice       = 0;
  distanceCost    = 0;
  serviceFee      = 0;
  isSubmitting    = false;
  bookingStep: 'idle' | 'estimated' | 'booked' = 'idle';

  /* ── Map picker ── */
  showMapPicker = false;

  /* ── Recent locations ── */
  recentLocations: string[] = [];

  /* ── Profile dropdown ── */
  profileDropOpen = false;

  @ViewChild('mainContent') mainContentRef?: ElementRef<HTMLElement>;

  /* ── Wallet / Add-money modal ── */
  showAddMoneyModal = false;
  addMoneyStep: 'amount' | 'method' | 'processing' | 'success' = 'amount';
  addMoneyMethod: 'upi' | 'netbanking' = 'upi';
  quickAmounts = [100, 200, 500, 1000, 2000];
  selectedAmount = 500;
  customAmount = '';
  selectedUpiApp = '';
  upiId = '';
  selectedBank = '';
  walletTxns: WalletTxn[] = [];

  upiApps = [
    { id: 'phonepe',  label: 'PhonePe',    color: '#5f259f', bg: '#f3e8ff', emoji: '💜' },
    { id: 'gpay',     label: 'Google Pay',  color: '#1a73e8', bg: '#e8f0fe', emoji: '🔵' },
    { id: 'paytm',    label: 'Paytm',       color: '#00b9f5', bg: '#e0f7fe', emoji: '🔷' },
    { id: 'bharatpe', label: 'BharatPe',    color: '#e3262f', bg: '#fee2e2', emoji: '🇮🇳' },
    { id: 'bhim',     label: 'BHIM',        color: '#0b4f9c', bg: '#dbeafe', emoji: '🏛️' },
  ];

  banks = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
    'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'Federal Bank',
  ];

  /* ── Notifications ── */
  notifications: AppNotification[] = [];
  unreadCount = 0;

  /* ── Polling ── */
  private pollSub?: Subscription;
  private pollInterval: any;

  /* ── Package options ── */
  packageTypes: { value: PackageType; label: string; icon: string }[] = [
    { value: 'documents',   label: 'Documents',   icon: '📄' },
    { value: 'electronics', label: 'Electronics', icon: '💻' },
    { value: 'clothing',    label: 'Clothing',    icon: '👗' },
    { value: 'fragile',     label: 'Fragile',     icon: '🧊' },
    { value: 'food',        label: 'Food',        icon: '🍱' },
    { value: 'other',       label: 'Other',       icon: '📦' },
  ];

  /* ── Porter verification ── */
  isCheckingPorter = false;

  constructor(
    private authService:          AuthService,
    private deliveryService:      Delivery,
    private walletService:        Wallet,
    private userService:          UserService,
    private notificationsService: NotificationsService,
    private cdr:                  ChangeDetectorRef,
    private router:               Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    const loggedInUser = this.authService.getCurrentUser();
    if (loggedInUser) {
      this.user = loggedInUser;
      this.loadData();
      this.loadRecentLocations();
      this.loadTxns();
      this.loadNotifications();
      this.startPolling();
      // Start polling for notifications and deliveries every 20 seconds
      this.pollInterval = setInterval(() => {
        this.loadNotifications();
        this.loadData();
      }, 20000);
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  /* ─────────────── Helpers ─────────────── */

  getFirstName(): string {
    if (!this.user?.name) return 'User';
    return this.user.name.split(' ')[0];
  }

  getInitials(): string {
    if (!this.user?.name) return 'U';
    return this.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  /* ─────────────── Data loading ─────────────── */

  loadData(): void {
    if (!this.user.userId) return;
    forkJoin({
      deliveries: this.deliveryService.getUserDeliveries(this.user.userId),
      wallet:     this.walletService.getWalletByUserId(this.user.userId),
    }).subscribe({
      next: ({ deliveries, wallet }) => {
        this.deliveries = [...deliveries].reverse();
        this.wallet     = wallet;
        this.extractRecentLocations(deliveries);
        this.cdr.detectChanges();
      },
      error: err => console.error('Data load error', err),
    });
  }

  loadRecentLocations(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const stored = localStorage.getItem('recentLocations');
    if (stored) this.recentLocations = JSON.parse(stored);
  }

  extractRecentLocations(deliveries: any[]): void {
    const fromHistory = deliveries.map((d: any) => d.pickupAddress).filter(Boolean);
    const merged = [...new Set([...this.recentLocations, ...fromHistory])].slice(0, 5);
    this.recentLocations = merged;
    if (isPlatformBrowser(this.platformId))
      localStorage.setItem('recentLocations', JSON.stringify(merged));
  }

  startPolling(): void {
    this.pollSub = interval(30_000).pipe(
      switchMap(() => forkJoin({
        deliveries:    this.deliveryService.getUserDeliveries(this.user.userId).pipe(catchError(() => of([]))),
        notifications: this.notificationsService.getForUser(this.user.userId).pipe(catchError(() => of([]))),
      }))
    ).subscribe({
      next: ({ deliveries, notifications }: { deliveries: any[]; notifications: any[] }) => {
        this.deliveries    = [...deliveries].reverse();
        this.notifications = notifications;
        this.unreadCount   = notifications.filter((n: AppNotification) => !n.isRead).length;
        this.cdr.detectChanges();
      },
    });
  }

  loadNotifications(): void {
    if (!this.user.userId) return;
    this.notificationsService.getForUser(this.user.userId).pipe(catchError(() => of([]))).subscribe({
      next: (notifications: AppNotification[]) => {
        this.notifications = notifications;
        this.unreadCount   = notifications.filter(n => !n.isRead).length;
        this.cdr.detectChanges();
      },
    });
  }

  markNotificationRead(notificationId: number): void {
    this.notificationsService.markRead(notificationId).pipe(catchError(() => of(null))).subscribe(() => {
      const n = this.notifications.find(n => n.notificationId === notificationId);
      if (n) { n.isRead = true; this.unreadCount = this.notifications.filter(n => !n.isRead).length; }
      this.cdr.detectChanges();
    });
  }

  getPorterForDelivery(d: any): { name: string; phone: string; vehicle: string } | null {
    if (!['ACCEPTED', 'PICKED_UP', 'DELIVERED'].includes((d.status || '').toUpperCase())) return null;
    if (!d.commuterName) return null;
    return { name: d.commuterName, phone: d.commuterPhone || '', vehicle: d.commuterVehicle || '' };
  }

  /* ─────────────── Map picker ─────────────── */

  openMapPicker(): void  { this.showMapPicker = true; }
  closeMapPicker(): void { this.showMapPicker = false; }

  onMapConfirm(result: MapPickerResult): void {
    this.showMapPicker   = false;
    this.pickupAddress   = result.pickupAddress;
    this.pickupLat       = result.pickupLat;
    this.pickupLng       = result.pickupLng;
    this.dropAddress     = result.dropAddress;
    this.dropLat         = result.dropLat;
    this.dropLng         = result.dropLng;
    this.estimatedDist   = result.distanceKm;

    // Fixed ₹50 flat rate
    this.basePrice      = 50;
    this.distanceCost   = 0;
    this.serviceFee     = 0;
    this.estimatedPrice = 50;
    this.showPriceCard  = true;
    this.bookingStep    = 'estimated';
    this.cdr.detectChanges();
  }

  /* ─────────────── Manual price estimation ─────────────── */

  estimatePrice(): void {
    if (!this.pickupAddress.trim() || !this.dropAddress.trim()) return;

    if (this.pickupLat !== undefined && this.dropLat !== undefined) {
      // Use Haversine if we have coordinates from map
      const dist = this.haversineKm(this.pickupLat, this.pickupLng!, this.dropLat, this.dropLng!);
      this.estimatedDist = Math.round(dist * 10) / 10;
    } else {
      // Fallback pseudo-distance from string hashing
      const a = (this.pickupAddress + this.dropAddress).toLowerCase();
      let hash = 0;
      for (let i = 0; i < a.length; i++) hash = ((hash << 5) - hash + a.charCodeAt(i)) | 0;
      this.estimatedDist = 2 + (Math.abs(hash) % 280) / 10;
      this.estimatedDist = Math.round(this.estimatedDist * 10) / 10;
    }

    // Fixed ₹50 flat rate
    this.basePrice      = 50;
    this.distanceCost   = 0;
    this.serviceFee     = 0;
    this.estimatedPrice = 50;
    this.showPriceCard  = true;
    this.bookingStep    = 'estimated';
    this.cdr.detectChanges();
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ─────────────── Book delivery ─────────────── */

  bookDelivery(): void {
    if (this.isSubmitting || !this.user.userId) return;
    if (!this.pickupAddress.trim() || !this.dropAddress.trim()) return;

    this.isSubmitting = true;

    const payload: any = {
      senderId:            this.user.userId,
      pickupAddress:       this.pickupAddress,
      pickupLat:           this.pickupLat   ?? null,
      pickupLng:           this.pickupLng   ?? null,
      dropAddress:         this.dropAddress,
      dropLat:             this.dropLat     ?? null,
      dropLng:             this.dropLng     ?? null,
      packageType:         this.packageType  || 'other',
      weightKg:            Number(this.weightKg) || 1,
      receiverName:        this.receiverName         || '',
      receiverPhone:       this.receiverPhone         || '',
      specialInstructions: this.specialInstructions   || '',
      distanceKm:          this.estimatedDist || 5,
      basePrice:           this.basePrice    || 40,
      distanceCost:        this.distanceCost || 0,
      serviceFee:          this.serviceFee   || 15,
      totalAmount:         this.estimatedPrice || 150,
      status:              'PENDING',
      deliveryType:        'STANDARD',
    };

    this.deliveryService.createDelivery(payload).subscribe({
      next: () => {
        this.bookingStep = 'booked';
        this.saveRecentLocation(this.pickupAddress);
        // Deduct from wallet optimistically
        const amt = this.estimatedPrice || payload.totalAmount;
        if (this.wallet.balance >= amt) {
          this.wallet.balance -= amt;
          this.addTxn({ type: 'debit', amount: amt, description: `Delivery · ${this.dropAddress.slice(0, 30)}`, method: 'CarryGo Wallet' });
          this.walletService.deduct(this.user.userId, amt).pipe(catchError(() => of(null))).subscribe();
        }
        this.loadData();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Create delivery error', err);
        alert('Failed to book delivery. Please try again.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    this.pickupAddress = this.dropAddress = '';
    this.pickupLat = this.pickupLng = this.dropLat = this.dropLng = undefined;
    this.packageType = ''; this.weightKg = 1;
    this.receiverName = this.receiverPhone = this.specialInstructions = '';
    this.showPriceCard = false; this.estimatedPrice = 0; this.bookingStep = 'idle';
  }

  saveRecentLocation(addr: string): void {
    if (!addr || !isPlatformBrowser(this.platformId)) return;
    const updated = [addr, ...this.recentLocations.filter(l => l !== addr)].slice(0, 5);
    this.recentLocations = updated;
    localStorage.setItem('recentLocations', JSON.stringify(updated));
  }

  useRecentLocation(loc: string, field: 'pickup' | 'drop'): void {
    if (field === 'pickup') this.pickupAddress = loc;
    else this.dropAddress = loc;
    this.showPriceCard = false; this.bookingStep = 'idle';
  }

  /* ─────────────── Section nav ─────────────── */

  setSection(s: ActiveSection): void {
    this.activeSection = s;
    this.cdr.detectChanges();
    this.mainContentRef?.nativeElement.scrollTo({ top: 0 });
  }

  /* ─────────────── Delivery display helpers ─────────────── */

  getDeliveryId(d: any): string {
    const id   = d.deliveryId ?? d.id ?? 0;
    const year = new Date().getFullYear();
    return `CG-${year}-${String(id).padStart(3, '0')}`;
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':   return 'status-pending';
      case 'ACCEPTED':  return 'status-accepted';
      case 'PICKED_UP': return 'status-transit';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default:          return 'status-pending';
    }
  }

  getStatusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':   return 'Pending';
      case 'ACCEPTED':  return 'Accepted';
      case 'PICKED_UP': return 'In Transit';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default:          return status;
    }
  }

  getActiveDeliveries(): any[] {
    return this.deliveries.filter(d =>
      ['PENDING', 'ACCEPTED', 'PICKED_UP'].includes((d.status || '').toUpperCase())
    );
  }

  getDeliveredCount(): number {
    return this.deliveries.filter(d => (d.status || '').toUpperCase() === 'DELIVERED').length;
  }

  getTotalSpent(): number {
    return this.deliveries
      .filter(d => (d.status || '').toUpperCase() === 'DELIVERED')
      .reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  }

  /* ─────────────── Wallet / Add money ─────────────── */

  private loadTxns(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(TXN_KEY + '_' + this.user.userId);
      this.walletTxns = raw ? JSON.parse(raw) : [];
    } catch { this.walletTxns = []; }
  }

  private saveTxns(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(TXN_KEY + '_' + this.user.userId, JSON.stringify(this.walletTxns)); } catch {}
  }

  private addTxn(txn: Omit<WalletTxn, 'id' | 'date'>): void {
    const entry: WalletTxn = { ...txn, id: Date.now().toString(), date: new Date().toISOString() };
    this.walletTxns.unshift(entry);
    if (this.walletTxns.length > 50) this.walletTxns.length = 50;
    this.saveTxns();
  }

  get finalAddAmount(): number {
    return this.customAmount ? (parseFloat(this.customAmount) || 0) : this.selectedAmount;
  }

  get addMoneyValid(): boolean {
    if (this.finalAddAmount < 10) return false;
    if (this.addMoneyMethod === 'upi' && !this.selectedUpiApp && !this.upiId.trim()) return false;
    if (this.addMoneyMethod === 'netbanking' && !this.selectedBank) return false;
    return true;
  }

  openAddMoney(): void {
    this.addMoneyStep    = 'amount';
    this.addMoneyMethod  = 'upi';
    this.selectedAmount  = 500;
    this.customAmount    = '';
    this.selectedUpiApp  = '';
    this.upiId           = '';
    this.selectedBank    = '';
    this.showAddMoneyModal = true;
  }

  closeAddMoney(): void { this.showAddMoneyModal = false; }

  proceedToMethod(): void {
    if (this.finalAddAmount < 10) return;
    this.addMoneyStep = 'method';
  }

  confirmAddMoney(): void {
    if (!this.addMoneyValid) return;
    this.addMoneyStep = 'processing';
    const amt = this.finalAddAmount;
    const methodLabel = this.addMoneyMethod === 'upi'
      ? (this.selectedUpiApp ? this.upiApps.find(a => a.id === this.selectedUpiApp)?.label ?? 'UPI' : `UPI · ${this.upiId}`)
      : `Net Banking · ${this.selectedBank}`;

    // Optimistic: update balance immediately
    this.wallet.balance = (this.wallet.balance || 0) + amt;
    this.addTxn({ type: 'credit', amount: amt, description: 'Added to Wallet', method: methodLabel });
    this.cdr.detectChanges();

    // Simulate processing time, then show success
    setTimeout(() => {
      this.addMoneyStep = 'success';
      // Also call backend (fire & forget)
      this.walletService.topUp(this.user.userId, amt).pipe(catchError(() => of(null))).subscribe();
      this.cdr.detectChanges();
    }, 2000);
  }

  finishAddMoney(): void {
    this.showAddMoneyModal = false;
  }

  txnIcon(t: WalletTxn): string {
    return t.type === 'credit' ? '↓' : '↑';
  }

  /* ─────────────── Profile dropdown ─────────────── */

  toggleProfileDrop(): void { this.profileDropOpen = !this.profileDropOpen; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.profile-section')) this.profileDropOpen = false;
  }

  logout(): void { this.authService.logout(); }

  /* ─────────────── Commuter routing ─────────────── */

  isPorter(): boolean {
    const role: string = this.user?.role ?? '';
    return role.split(',').map((r: string) => r.trim().toLowerCase()).includes('porter');
  }

  goToCommuter(): void {
    if (this.isPorter()) {
      if (this.user?.userId) {
        this.router.navigate(['/porter-dashboard', this.user.userId]);
      }
    } else {
      this.router.navigate(['/commuter-register']);
    }
  }

}
