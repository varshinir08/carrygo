import {
  Component, OnInit, OnDestroy, HostListener,
  AfterViewInit, ViewChild, ViewChildren, QueryList, ElementRef,
  Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../services/user-service';
import { AuthService } from '../services/auth.service';
import { Delivery } from '../services/delivery/delivery';
import { PorterStatusService } from '../services/porter-status.service';
import { SseService } from '../services/sse.service';
import { forkJoin, interval, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

interface DeliveryOrder {
  deliveryId: number;
  senderId: number;
  commuterId: number | null;
  pickupAddress: string;
  pickupContact?: string;
  pickupPhone?: string;
  dropAddress: string;
  packageType: string;
  totalAmount: number;
  distanceKm: number;
  status: string;
  createdAt: string;
  otp?: string;
  surgeMultiplier?: number;
  surgeLabel?: string;
  vehicleType?: string;
}

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
  avgRating?: number | null;
}

interface WalletData {
  walletId: number;
  userId: number;
  balance: number;
  lastUpdated: string;
}

@Component({
  selector: 'porter-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './porter-homepage.html',
  styleUrls: ['./porter-homepage.css']
})
export class PorterDashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('deliveriesChart') deliveriesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('earningsChart')   earningsChartRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChildren('otpInput')     otpInputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  porterProfile: PorterProfile | null = null;
  walletData: WalletData | null = null;
  get isOnline(): boolean { return this.statusService.isOnline; }
  isToggling    = false;
  statusToast   = '';
  earningsToday = 0;
  walletBalance = 0;
  notificationCount = 0;
  showNotifPanel = false;
  userInitials  = '';
  errorMessage  = '';
  showProfileDropdown = false;
  activeSection = 'dashboard';

  // Delivery data
  activeOrders:  DeliveryOrder[] = [];
  orderRequests: DeliveryOrder[] = [];
  allDeliveries: DeliveryOrder[] = [];

  // Stats
  todayDeliveries  = 0;
  activeOrdersCount = 0;
  completedCount   = 0;
  // Chart data (last 7 days)
  weekLabels:    string[] = [];
  weekDeliveries: number[] = [];
  weekEarnings:   number[] = [];
  private deliveriesChartInstance: any = null;
  private earningsChartInstance:   any = null;
  private chartLib: any = null;

  // ── Feature 3: Ride Request Popup ────────────────────────────────────────
  showRequestPopup  = false;
  incomingRequest:  DeliveryOrder | null = null;
  countdown         = 15;
  private countdownTimer: any = null;

  // ── Feature 4: OTP Flow ───────────────────────────────────────────────────
  showOtpPanel  = false;
  otpOrderId:   number | null = null;
  otpDigits     = ['', '', '', ''];
  otpError      = '';
  otpSubmitting = false;

  // ── Chat ─────────────────────────────────────────────────────────────────
  showChat        = false;
  chatDeliveryId: number | null = null;
  chatOrder:      DeliveryOrder | null = null;
  chatMessages:   any[] = [];
  chatInput       = '';
  chatSending     = false;
  @ViewChild('chatScroll') chatScrollRef!: ElementRef<HTMLElement>;

  // Navigation map modal
  showNavMap        = false;
  navOrder:         DeliveryOrder | null = null;
  private navMapInstance:   any  = null;
  private navMapLib:        any  = null;
  private gpsWatchId:       number | null = null;
  private porterLocMarker:  any  = null;
  private readonly NAV_MAP_KEY = 'cg_nav_map_order_id';
  @ViewChild('navMapEl') navMapElRef!: ElementRef<HTMLDivElement>;

  private sseSub: Subscription | null = null;
  private pollSub: Subscription | null = null;
  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private userService:    UserService,
    private authService:    AuthService,
    private deliveryService: Delivery,
    private router:         Router,
    private http:           HttpClient,
    private statusService:  PorterStatusService,
    private sseService:     SseService,
    private cdr:            ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.buildWeekLabels();
    this.loadPorterData();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.sseSub?.unsubscribe();
    this.sseService.disconnect();
    this.stopCountdown();
    this.destroyCharts();
    if (this.chatDeliveryId) this.sseService.unsubscribeFromChat(this.chatDeliveryId);
    this.stopGpsWatch();
  }

  // ── Week labels ──────────────────────────────────────────────────────────
  buildWeekLabels(): void {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    this.weekLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return days[d.getDay()];
    });
  }

  // ── Data load ─────────────────────────────────────────────────────────────
  loadPorterData(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) { this.router.navigate(['/login']); return; }

    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (profile: PorterProfile) => {
        this.porterProfile = profile;
        this.statusService.init(profile.userId);
        this.generateInitials(profile.name);
        this.loadWallet(profile.userId);
        this.loadDeliveries(profile.userId);
        this.startPolling(profile.userId);
        this.connectSse(profile.userId);
      },
      error: () => { this.errorMessage = 'Failed to load porter profile'; }
    });
  }

  loadWallet(userId: number): void {
    this.userService.getWalletByUserId(userId).subscribe({
      next: (wallet: WalletData) => {
        this.walletData    = wallet;
        this.walletBalance = wallet.balance ?? 0;
        this.earningsToday = wallet.balance ?? 0;
      },
      error: () => { this.walletBalance = 0; this.earningsToday = 0; }
    });
  }

  loadDeliveries(userId: number): void {
    // Load MY assigned orders; also catch up on any PENDING orders I may have missed via SSE
    forkJoin({
      mine:    this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/commuter/${userId}`)
                 .pipe(catchError(() => of([] as DeliveryOrder[]))),
      pending: this.isOnline
                 ? this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${userId}`)
                     .pipe(catchError(() => of([] as DeliveryOrder[])))
                 : of([] as DeliveryOrder[]),
    }).subscribe({
      next: ({ mine, pending }) => {
        this.allDeliveries     = mine;
        this.activeOrders      = mine.filter(d =>
          d.status === 'ACCEPTED' || d.status === 'ARRIVED_AT_PICKUP' || d.status === 'PICKED_UP');
        this.activeOrdersCount = this.activeOrders.length;
        this.completedCount    = mine.filter(d => d.status === 'DELIVERED').length;
        this.todayDeliveries   = mine.length;
        this.buildChartData(mine);
        this.renderCharts();

        // Catch-up: add valid PENDING orders that SSE may have missed
        if (this.isOnline && pending.length) {
          const existingIds = new Set(this.orderRequests.map(r => r.deliveryId));
          const missed = pending
            .filter(p => this.isValidOrder(p))
            .filter(p => !existingIds.has(p.deliveryId));
          if (missed.length) {
            this.orderRequests     = [...missed, ...this.orderRequests];
            this.notificationCount = this.orderRequests.length;
            this.openPopup(missed[0]);
          }
        }

        this.cdr.detectChanges();

        // Auto-restore the nav map if it was open before the page refreshed
        if (isPlatformBrowser(this.platformId)) {
          const savedId = sessionStorage.getItem(this.NAV_MAP_KEY);
          if (savedId && !this.showNavMap) {
            const order = this.activeOrders.find(o => o.deliveryId === Number(savedId));
            if (order) {
              setTimeout(() => this.openNavMap(order), 250);
            } else {
              sessionStorage.removeItem(this.NAV_MAP_KEY); // order no longer active
            }
          }
        }
      }
    });
  }

  startPolling(userId: number): void {
    this.pollSub = interval(30000).pipe(
      switchMap(() => forkJoin({
        mine:    this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/commuter/${userId}`)
                   .pipe(catchError(() => of([] as DeliveryOrder[]))),
        pending: this.isOnline
                   ? this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${userId}`)
                       .pipe(catchError(() => of([] as DeliveryOrder[])))
                   : of([] as DeliveryOrder[]),
      }))
    ).subscribe({
      next: ({ mine, pending }) => {
        this.activeOrders      = mine.filter(d =>
          d.status === 'ACCEPTED' || d.status === 'ARRIVED_AT_PICKUP' || d.status === 'PICKED_UP');
        this.activeOrdersCount = this.activeOrders.length;
        this.completedCount    = mine.filter(d => d.status === 'DELIVERED').length;

        // Catch-up: surface valid PENDING requests missed by SSE
        if (this.isOnline && pending.length) {
          const existingIds = new Set(this.orderRequests.map(r => r.deliveryId));
          const missed = pending
            .filter(p => this.isValidOrder(p))
            .filter(p => !existingIds.has(p.deliveryId));
          if (missed.length) {
            this.orderRequests     = [...missed, ...this.orderRequests];
            this.notificationCount = this.orderRequests.length;
            if (!this.showRequestPopup) this.openPopup(missed[0]);
          }
        }
        this.cdr.detectChanges();
      }
    });
  }

  // ── SSE Subscription (Feature 3) ─────────────────────────────────────────
  connectSse(userId: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // isPorter=true → also subscribes to /topic/new-orders broadcast topic
    this.sseSub = this.sseService.connect(userId, true).subscribe({
      next: ({ event, data }) => {
        if (event === 'rideRequest' && this.isOnline) {
          this.handleIncomingRequest(data);
        }
        if (event === 'chatMessage' && this.showChat && data.deliveryId === this.chatDeliveryId) {
          if (!this.chatMessages.some((m: any) => m.id === data.id)) {
            this.chatMessages = [...this.chatMessages, data];
            this.cdr.detectChanges();
            this.scrollPorterChatToBottom();
          }
        }
      }
    });
  }

  handleIncomingRequest(request: DeliveryOrder): void {
    if (!this.isValidOrder(request)) return;
    const alreadySeen = this.orderRequests.some(r => r.deliveryId === request.deliveryId);
    if (!alreadySeen) {
      this.orderRequests     = [request, ...this.orderRequests];
      this.notificationCount = this.orderRequests.length;
    }
    this.openPopup(request);
    this.cdr.detectChanges();
  }

  // ── Popup logic (Feature 3) ───────────────────────────────────────────────
  openPopup(request: DeliveryOrder): void {
    this.stopCountdown();
    this.incomingRequest = request;
    this.countdown       = 15;
    this.showRequestPopup = true;

    this.countdownTimer = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();
      if (this.countdown <= 0) {
        this.autoDismissPopup();
      }
    }, 1000);
  }

  autoDismissPopup(): void {
    const req = this.incomingRequest;
    this.closePopup();
    // Notify backend that this porter timed out (counts as implicit reject)
    if (req && this.porterProfile) {
      this.http.patch(`${this.apiBase}/deliveries/${req.deliveryId}/reject?commuterId=${this.porterProfile.userId}`, {})
        .pipe(catchError(() => of(null))).subscribe();
    }
  }

  closePopup(): void {
    this.stopCountdown();
    this.showRequestPopup  = false;
    this.incomingRequest   = null;
    this.cdr.detectChanges();
  }

  private stopCountdown(): void {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  handleAcceptPopup(): void {
    const req = this.incomingRequest;
    this.closePopup();
    if (req) this.acceptOrder(req);
  }

  handleRejectPopup(): void {
    const req = this.incomingRequest;
    this.closePopup();
    if (req) this.rejectOrder(req);
  }

  get countdownPct(): number { return (this.countdown / 15) * 100; }
  get countdownDash(): number {
    const r = 26; const circ = 2 * Math.PI * r;
    return circ - (this.countdownPct / 100) * circ;
  }
  get countdownCircumference(): number { return 2 * Math.PI * 26; }

  // ── Chart data ────────────────────────────────────────────────────────────
  buildChartData(deliveries: DeliveryOrder[]): void {
    const today = new Date();
    this.weekDeliveries = Array(7).fill(0);
    this.weekEarnings   = Array(7).fill(0);

    deliveries.filter(d => d.status === 'DELIVERED').forEach(d => {
      const created = new Date(d.createdAt);
      const diff    = Math.round((today.getTime() - created.getTime()) / 86400000);
      const idx     = 6 - diff;
      if (idx >= 0 && idx < 7) {
        this.weekDeliveries[idx]++;
        this.weekEarnings[idx] += d.totalAmount ?? 0;
      }
    });
  }

  async renderCharts(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (!this.chartLib) {
        const mod    = await import('chart.js');
        this.chartLib = mod.Chart;
        this.chartLib.register(...mod.registerables);
      }
      this.destroyCharts();
      setTimeout(() => { this.buildDeliveriesChart(); this.buildEarningsChart(); }, 50);
    } catch (e) { console.warn('Chart.js load error', e); }
  }

  private buildDeliveriesChart(): void {
    const el = this.deliveriesChartRef?.nativeElement;
    if (!el || !this.chartLib) return;
    this.deliveriesChartInstance = new this.chartLib(el, {
      type: 'bar',
      data: {
        labels: this.weekLabels,
        datasets: [{ label: 'Deliveries', data: this.weekDeliveries,
          backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#64748b', font: { size: 11 } }, grid: { color: '#f1f5f9' } }
        }
      }
    });
  }

  private buildEarningsChart(): void {
    const el = this.earningsChartRef?.nativeElement;
    if (!el || !this.chartLib) return;
    this.earningsChartInstance = new this.chartLib(el, {
      type: 'line',
      data: {
        labels: this.weekLabels,
        datasets: [{ label: '₹ Earnings', data: this.weekEarnings,
          borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)',
          borderWidth: 2.5, pointBackgroundColor: '#7c3aed', pointRadius: 4, fill: true, tension: 0.4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { color: '#64748b', font: { size: 11 },
            callback: (v: any) => `₹${v}` }, grid: { color: '#f1f5f9' } }
        }
      }
    });
  }

  private destroyCharts(): void {
    this.deliveriesChartInstance?.destroy(); this.deliveriesChartInstance = null;
    this.earningsChartInstance?.destroy();   this.earningsChartInstance   = null;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleStatus(): void {
    if (!this.porterProfile || this.isToggling) return;
    this.isToggling = true;
    const newStatus = !this.isOnline;
    this.statusService.set(newStatus);

    if (!newStatus) { this.orderRequests = []; this.notificationCount = 0; }

    this.statusToast = newStatus ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; }, 500);
    setTimeout(() => { this.statusToast = ''; }, 2800);

    const uid = this.porterProfile.userId;
    this.userService.updatePorterStatus(uid, newStatus).subscribe({
      next:  () => { if (newStatus) this.fetchPendingForPorter(uid); },
      error: () => { if (newStatus) this.fetchPendingForPorter(uid); }
    });
  }

  loadAvailableOrders(): void {}

  /** One-shot catch-up: fetch any PENDING orders we may have missed via SSE. */
  fetchPendingForPorter(userId: number): void {
    this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${userId}`)
      .pipe(catchError(() => of([] as DeliveryOrder[])))
      .subscribe({
        next: (pending) => {
          const valid = pending.filter(p => this.isValidOrder(p));
          if (!valid.length) return;
          const existingIds = new Set(this.orderRequests.map(r => r.deliveryId));
          const missed = valid.filter(p => !existingIds.has(p.deliveryId));
          if (missed.length) {
            this.orderRequests     = [...missed, ...this.orderRequests];
            this.notificationCount = this.orderRequests.length;
            this.openPopup(missed[0]);
            this.cdr.detectChanges();
          }
        }
      });
  }

  /** An order is valid only if it has both pickup and drop addresses. */
  private isValidOrder(order: DeliveryOrder): boolean {
    return !!(order.pickupAddress?.trim()) && !!(order.dropAddress?.trim());
  }

  // ── Accept / Reject (Feature 2 — no fake orders) ─────────────────────────
  acceptOrder(order: DeliveryOrder): void {
    if (!this.porterProfile) return;
    this.http.patch<DeliveryOrder>(
      `${this.apiBase}/deliveries/${order.deliveryId}/accept?commuterId=${this.porterProfile.userId}`, {}
    ).subscribe({
      next: (updated) => {
        const merged: DeliveryOrder = { ...order, ...updated,
          pickupAddress: updated.pickupAddress || order.pickupAddress,
          dropAddress:   updated.dropAddress   || order.dropAddress,
          distanceKm:    updated.distanceKm    ?? order.distanceKm,
        };
        this.orderRequests     = this.orderRequests.filter(o => o.deliveryId !== order.deliveryId);
        this.activeOrders      = [merged, ...this.activeOrders];
        this.activeOrdersCount = this.activeOrders.length;
        this.todayDeliveries   = this.activeOrders.length + this.completedCount;
        this.notificationCount = this.orderRequests.length;
        // Feature 4: Auto-open navigation map immediately after accept
        this.openNavMap(merged);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.status === 409 ? 'Order was already taken by another porter' : 'Failed to accept order.';
        this.errorMessage = msg;
        setTimeout(() => { this.errorMessage = ''; this.cdr.detectChanges(); }, 3000);
      }
    });
  }

  rejectOrder(order: DeliveryOrder): void {
    this.orderRequests     = this.orderRequests.filter(o => o.deliveryId !== order.deliveryId);
    this.notificationCount = this.orderRequests.length;
    // Notify backend so broadcast progress bar updates for the user
    if (this.porterProfile) {
      this.http.patch(`${this.apiBase}/deliveries/${order.deliveryId}/reject?commuterId=${this.porterProfile.userId}`, {})
        .pipe(catchError(() => of(null))).subscribe();
    }
    this.cdr.detectChanges();
  }

  // ── Feature 4: "I've Arrived" → OTP flow ──────────────────────────────────
  markArrived(order: DeliveryOrder): void {
    if (!this.porterProfile) return;
    this.http.patch<DeliveryOrder>(
      `${this.apiBase}/deliveries/${order.deliveryId}/arrived?commuterId=${this.porterProfile.userId}`, {}
    ).subscribe({
      next: (updated) => {
        const idx = this.activeOrders.findIndex(o => o.deliveryId === order.deliveryId);
        if (idx !== -1) this.activeOrders[idx] = { ...this.activeOrders[idx], ...updated };
        this.showOtpPanel = true;
        this.otpOrderId   = order.deliveryId;
        this.otpDigits    = ['', '', '', ''];
        this.otpError     = '';
        this.cdr.detectChanges();
      },
      error: () => { this.errorMessage = 'Failed to mark arrival.'; }
    });
  }

  trackOtpIndex(index: number): number { return index; }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    const { key } = event;

    // Allow navigation keys to pass through unchanged
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;

    // Allow Ctrl+C / Cmd+C (copy) and Ctrl+V / Cmd+V (paste handled by onOtpPaste)
    if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a'].includes(key.toLowerCase())) return;

    // Always block default so the browser never writes to the DOM
    event.preventDefault();

    if (key === 'Backspace') {
      const digits = [...this.otpDigits];
      if (digits[index]) {
        // Clear current box
        digits[index] = '';
        this.otpDigits = digits;
      } else if (index > 0) {
        // Move back and clear previous box
        digits[index - 1] = '';
        this.otpDigits = digits;
        this.otpInputRefs?.toArray()[index - 1]?.nativeElement.focus();
      }
      this.cdr.detectChanges();
      return;
    }

    if (/^\d$/.test(key)) {
      const digits = [...this.otpDigits];
      digits[index] = key;
      this.otpDigits = digits;
      this.cdr.detectChanges();
      // Auto-advance to next box
      if (index < 3) {
        this.otpInputRefs?.toArray()[index + 1]?.nativeElement.focus();
      }
    }
    // All other keys (letters, symbols, etc.) are silently ignored
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    // Extract up to 4 digits from whatever was pasted
    const digits = pasted.replace(/\D/g, '').slice(0, 4).split('');
    if (digits.length === 0) return;

    const newDigits = [...this.otpDigits];
    digits.forEach((d, i) => { newDigits[i] = d; });
    this.otpDigits = newDigits;
    this.cdr.detectChanges();

    // Focus the box after the last pasted digit (or stay on box 3 if all filled)
    const focusIndex = Math.min(digits.length, 3);
    this.otpInputRefs?.toArray()[focusIndex]?.nativeElement.focus();
  }

  copyOtp(): void {
    const otp = this.otpDigits.join('');
    if (!otp.trim() || !isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(otp).catch(() => {});
  }

  submitOtp(): void {
    const otp = this.otpDigits.map(d => d.trim()).join('');
    if (otp.length !== 4 || !/^\d{4}$/.test(otp) || !this.otpOrderId || this.otpSubmitting) return;
    this.otpSubmitting = true;
    this.otpError      = '';

    this.http.post<any>(
      `${this.apiBase}/deliveries/${this.otpOrderId}/verify-otp`,
      { enteredOtp: otp }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.showOtpPanel = false;
          this.otpOrderId   = null;
          // Update status to PICKED_UP in local list
          const idx = this.activeOrders.findIndex(o => o.deliveryId === res.delivery?.deliveryId);
          if (idx !== -1) this.activeOrders[idx] = { ...this.activeOrders[idx], status: 'PICKED_UP' };
          // Switch map to drop route
          const order = this.activeOrders.find(o => o.deliveryId === res.delivery?.deliveryId);
          if (order) this.openNavMap(order);
          this.cdr.detectChanges();
        } else {
          this.otpError = res.error || 'Incorrect OTP — ask the rider to check their app';
        }
        this.otpSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.otpError     = err?.error?.error || 'Incorrect OTP — ask the rider to check their app';
        this.otpSubmitting = false;
        this.otpDigits     = ['', '', '', ''];
        this.cdr.detectChanges();
      }
    });
  }

  cancelOtp(): void {
    this.showOtpPanel = false; this.otpOrderId = null;
    this.otpDigits    = ['', '', '', '']; this.otpError = '';
    this.cdr.detectChanges();
  }

  markDelivered(order: DeliveryOrder): void {
    this.http.patch<DeliveryOrder>(
      `${this.apiBase}/deliveries/${order.deliveryId}/status?status=DELIVERED`, {}
    ).subscribe({
      next: () => {
        const earned        = order.totalAmount ?? 0;
        this.activeOrders      = this.activeOrders.filter(o => o.deliveryId !== order.deliveryId);
        this.activeOrdersCount = this.activeOrders.length;
        this.completedCount++;
        this.todayDeliveries   = this.activeOrders.length + this.completedCount;
        this.earningsToday += earned;
        this.walletBalance += earned;
        this.weekDeliveries[6]++;
        this.weekEarnings[6] += earned;
        this.updateChartsData();
        if (this.porterProfile) this.loadWallet(this.porterProfile.userId);
        this.cdr.detectChanges();
      }
    });
  }

  private updateChartsData(): void {
    if (this.deliveriesChartInstance) {
      this.deliveriesChartInstance.data.datasets[0].data = [...this.weekDeliveries];
      this.deliveriesChartInstance.update();
    }
    if (this.earningsChartInstance) {
      this.earningsChartInstance.data.datasets[0].data = [...this.weekEarnings];
      this.earningsChartInstance.update();
    }
  }

  // ── Single contextual action driving ACCEPTED → ARRIVED → OTP → PICKED_UP → DELIVERED
  nextAction(order: DeliveryOrder): void {
    if (order.status === 'ACCEPTED')        { this.markArrived(order); return; }
    if (order.status === 'ARRIVED_AT_PICKUP') {
      this.showOtpPanel = true; this.otpOrderId = order.deliveryId;
      this.otpDigits = ['', '', '', '']; this.otpError = '';
      this.cdr.detectChanges(); return;
    }
    if (order.status === 'PICKED_UP')       this.markDelivered(order);
  }

  getActionLabel(order: DeliveryOrder): string {
    if (order.status === 'ACCEPTED')         return "I've Arrived";
    if (order.status === 'ARRIVED_AT_PICKUP') return 'Enter OTP';
    return 'End Ride';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACCEPTED: 'Heading to pickup',
      ARRIVED_AT_PICKUP: 'At pickup — awaiting OTP',
      PICKED_UP: 'Ride in progress',
      DELIVERED: 'Delivered'
    };
    return map[status] ?? status;
  }

  isPickedUp(order: DeliveryOrder): boolean { return order.status === 'PICKED_UP'; }
  isArrived(order: DeliveryOrder): boolean  { return order.status === 'ARRIVED_AT_PICKUP'; }

  // ── Navigation Map ────────────────────────────────────────────────────────
  openNavMap(order: DeliveryOrder): void {
    this.navOrder   = order;
    this.showNavMap = true;
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.NAV_MAP_KEY, String(order.deliveryId));
    }
    setTimeout(() => this.initNavMap(order), 80);
  }

  closeNavMap(): void {
    this.showNavMap = false;
    this.navMapInstance?.remove();
    this.navMapInstance = null;
    this.navOrder = null;
    this.stopGpsWatch();
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(this.NAV_MAP_KEY);
    }
  }

  private stopGpsWatch(): void {
    if (this.gpsWatchId !== null && isPlatformBrowser(this.platformId)) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.porterLocMarker = null;
  }

  private async initNavMap(order: DeliveryOrder): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.navMapElRef?.nativeElement;
    if (!el) return;

    if (!this.navMapLib) {
      this.navMapLib = await import('leaflet');
      delete (this.navMapLib.Icon.Default.prototype as any)._getIconUrl;
      this.navMapLib.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }

    const L = this.navMapLib;
    this.stopGpsWatch();           // clear previous GPS watch before re-init
    this.navMapInstance?.remove();

    const map = L.map(el, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    this.navMapInstance = map;

    const [pickupCoord, dropCoord] = await Promise.all([
      this.geocodeAddress(order.pickupAddress),
      this.geocodeAddress(order.dropAddress),
    ]);

    if (!pickupCoord || !dropCoord) return;

    const greenIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const redIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const myLocIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.35),0 2px 8px rgba(37,99,235,0.5)"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });

    L.marker([pickupCoord.lat, pickupCoord.lng], { icon: greenIcon })
      .addTo(map).bindPopup(`<b>Pickup</b><br>${order.pickupAddress}`).openPopup();
    L.marker([dropCoord.lat,   dropCoord.lng],   { icon: redIcon })
      .addTo(map).bindPopup(`<b>Drop</b><br>${order.dropAddress}`);

    const bounds = L.latLngBounds(
      [pickupCoord.lat, pickupCoord.lng],
      [dropCoord.lat,   dropCoord.lng]
    );
    map.fitBounds(bounds, { padding: [40, 40] });

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoord.lng},${pickupCoord.lat};${dropCoord.lng},${dropCoord.lat}?overview=full&geometries=geojson`;
      const resp: any = await fetch(url).then(r => r.json());
      if (resp.routes?.[0]) {
        const color = order.status === 'PICKED_UP' ? '#7c3aed' : '#2563eb';
        L.geoJSON(resp.routes[0].geometry, {
          style: { color, weight: 4, opacity: 0.85 }
        }).addTo(map);
        const dist = (resp.routes[0].distance / 1000).toFixed(1);
        const dur  = Math.round(resp.routes[0].duration / 60);
        if (this.navOrder) (this.navOrder as any)._routeInfo = `${dist} km · ~${dur} min`;
      }
    } catch {}

    // ── Live GPS tracking — continuously update the porter's own location ──
    if ('geolocation' in navigator) {
      this.gpsWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (this.porterLocMarker) {
            // Just move the existing marker — no flicker
            this.porterLocMarker.setLatLng([lat, lng]);
          } else if (this.navMapInstance) {
            this.porterLocMarker = L.marker([lat, lng], { icon: myLocIcon, zIndexOffset: 1000 })
              .addTo(this.navMapInstance)
              .bindPopup('<b>Your location</b>');
          }
        },
        (err) => console.warn('GPS unavailable:', err.message),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
    }
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } }).then(r => r.json());
      if (res[0]) return { lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon) };
    } catch {}
    return null;
  }

  getRouteInfo(order: DeliveryOrder): string { return (order as any)._routeInfo || ''; }

  openInMaps(order: DeliveryOrder): void {
    window.open(`https://www.openstreetmap.org/directions?from=${encodeURIComponent(order.pickupAddress)}&to=${encodeURIComponent(order.dropAddress)}`, '_blank');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get weekTotalEarnings(): number   { return this.weekEarnings.reduce((a, b) => a + b, 0); }
  get weekTotalDeliveries(): number { return this.weekDeliveries.reduce((a, b) => a + b, 0); }

  navigate(section: string): void {
    this.activeSection = section;
    if (section === 'dashboard') setTimeout(() => this.renderCharts(), 100);
  }

  getFirstName(): string {
    const parts = this.porterProfile?.name?.split(' ');
    return parts?.length ? parts[0] : 'Porter';
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; this.showProfileDropdown = false; }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; this.showNotifPanel = false; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const profileEl = document.querySelector('.profile-section');
    if (profileEl && !profileEl.contains(event.target as Node)) this.showProfileDropdown = false;
    const notifEl = document.querySelector('.notif-wrap');
    if (notifEl && !notifEl.contains(event.target as Node)) this.showNotifPanel = false;
  }

  goToUserDashboard(): void {
    const userId = this.porterProfile?.userId ?? this.authService.getLoggedInUserId();
    if (userId) this.router.navigate(['/user-dashboard', userId]);
    else        this.router.navigate(['/user-dashboard']);
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  openPorterChat(order: DeliveryOrder): void {
    this.chatOrder      = order;
    this.chatDeliveryId = order.deliveryId;
    this.chatMessages   = [];
    this.showChat       = true;
    this.http.get<any[]>(`${this.apiBase}/chat/${order.deliveryId}`)
      .pipe(catchError(() => of([] as any[])))
      .subscribe(msgs => {
        this.chatMessages = msgs;
        this.cdr.detectChanges();
        this.scrollPorterChatToBottom();
      });
    this.sseService.subscribeToChat(order.deliveryId);
  }

  closePorterChat(): void {
    if (this.chatDeliveryId) this.sseService.unsubscribeFromChat(this.chatDeliveryId);
    this.showChat       = false;
    this.chatDeliveryId = null;
    this.chatOrder      = null;
    this.chatMessages   = [];
    this.chatInput      = '';
  }

  sendPorterChatMessage(): void {
    const msg = this.chatInput.trim();
    if (!msg || !this.chatDeliveryId || this.chatSending || !this.porterProfile) return;
    this.chatSending = true;
    const body = {
      senderId:   String(this.porterProfile.userId),
      senderName: this.porterProfile.name,
      senderRole: 'PORTER',
      message:    msg
    };
    this.http.post<any>(`${this.apiBase}/chat/${this.chatDeliveryId}/send`, body)
      .pipe(catchError(() => of(null)))
      .subscribe(saved => {
        // Dedup: WebSocket broadcast may arrive before the HTTP response —
        // only add if not already in the list (prevents double-render)
        if (saved && !this.chatMessages.some((m: any) => m.id === saved.id)) {
          this.chatMessages = [...this.chatMessages, saved];
        }
        this.chatInput   = '';
        this.chatSending = false;
        this.cdr.detectChanges();
        this.scrollPorterChatToBottom();
      });
  }

  onPorterChatKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendPorterChatMessage(); }
  }

  private scrollPorterChatToBottom(): void {
    setTimeout(() => {
      const el = this.chatScrollRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
