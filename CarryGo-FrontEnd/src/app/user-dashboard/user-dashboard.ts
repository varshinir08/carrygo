import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  HostListener, Inject, PLATFORM_ID, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationsService, AppNotification } from '../services/notifications.service';
import { Delivery } from '../services/delivery/delivery';
import { Wallet } from '../services/wallet/wallet';
import { UserService } from '../services/user-service';
import { MapPickerComponent, MapPickerResult } from '../map-picker/map-picker';
import { ChatbotComponent } from '../chatbot/chatbot';
import { FareService, FareEstimate } from '../services/fare.service';
import { SseService } from '../services/sse.service';
import { IntercityService, IntercityCourier } from '../services/intercity.service';
import { forkJoin, interval, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface ChatMsg {
  id: number;
  deliveryId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  sentAt: string;
}

const TXN_KEY = 'carrygo_wallet_txns';

interface WalletTxn {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  method: string;
  date: string;
}

type ActiveSection = 'home' | 'deliveries' | 'wallet' | 'services' | 'intercity';
type PackageType   = 'documents' | 'electronics' | 'clothing' | 'fragile' | 'food' | 'other';
type BookingStep   = 'idle' | 'estimated' | 'confirming-surge' | 'booked';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapPickerComponent, ChatbotComponent],
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

  /* ── Intercity ── */
  allIntercityCouriers: IntercityCourier[] = [];
  intercityCouriers: IntercityCourier[] = [];
  intercityLoading  = false;
  intercityError    = '';
  intercityFromCity = '';
  intercityToCity   = '';
  intercitySortBy   = '';

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
  vehicleType          = 'auto';

  readonly vehicleTypes = [
    { id: 'bike',  label: 'Bike',  icon: '🏍️' },
    { id: 'auto',  label: 'Auto',  icon: '🛺' },
    { id: 'mini',  label: 'Mini',  icon: '🚗' },
    { id: 'sedan', label: 'Sedan', icon: '🚙' },
    { id: 'suv',   label: 'SUV',   icon: '🚐' },
  ];

  /* ── Fare estimate (Feature 1) ── */
  showPriceCard   = false;
  fareEstimate:   FareEstimate | null = null;
  fareLoading     = false;
  fareError       = '';
  locationError   = '';
  estimatedDist   = 0;
  estimatedPrice  = 0;
  basePrice       = 0;
  distanceCost    = 0;
  serviceFee      = 0;
  isSubmitting    = false;
  bookingStep: BookingStep = 'idle';

  /* ── Surge confirmation (Feature 1) ── */
  showSurgeConfirm = false;

  /* ── Broadcast progress bar (Feature 5) ── */
  broadcastState: any = null;
  activeBookingId: number | null = null;

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

  /* ── Polling & SSE ── */
  private pollSub?: Subscription;
  private sseSub?: Subscription;
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

  /* ── Delivery detail drawer ── */
  showDeliveryDetail = false;
  selectedDelivery: any = null;

  /* ── Porter verification ── */
  isCheckingPorter = false;

  /* ── Address autocomplete ── */
  pickupSuggestions: NominatimResult[] = [];
  dropSuggestions:   NominatimResult[] = [];
  showPickupSugg = false;
  showDropSugg   = false;
  private pickupDebounce: any = null;
  private dropDebounce:   any = null;

  /* ── Chat window ── */
  showChat         = false;
  chatDeliveryId:  number | null = null;
  chatDelivery:    any = null;
  chatMessages:    ChatMsg[] = [];
  chatInput        = '';
  chatSending      = false;
  chatUnreadCount  = 0;    // unread messages while chat window is closed
  @ViewChild('chatScroll') chatScrollRef?: ElementRef<HTMLElement>;
  @ViewChild('inlineMapEl') inlineMapElRef?: ElementRef<HTMLDivElement>;

  /* ── Inline route map ── */
  inlineRouteDist = '';
  inlineRouteDur  = '';
  private inlineMapInstance: any = null;
  private leafletLib: any = null;

  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private authService:          AuthService,
    private deliveryService:      Delivery,
    private walletService:        Wallet,
    private userService:          UserService,
    private notificationsService: NotificationsService,
    private fareService:          FareService,
    private sseService:           SseService,
    private intercityService:     IntercityService,
    private http:                 HttpClient,
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
      this.connectSse();
      this.pollInterval = setInterval(() => {
        this.loadNotifications();
        this.loadData();
      }, 20000);
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.sseSub?.unsubscribe();
    this.sseService.disconnect();
    if (this.pollInterval) clearInterval(this.pollInterval);
    clearTimeout(this.pickupDebounce);
    clearTimeout(this.dropDebounce);
    this.inlineMapInstance?.remove();
  }

  /* ── SSE (Feature 5) ─────────────────────────────────────────────────── */

  connectSse(): void {
    if (!isPlatformBrowser(this.platformId) || !this.user?.userId) return;
    this.sseSub = this.sseService.connect(this.user.userId).subscribe({
      next: ({ event, data }) => {
        if (event === 'broadcastUpdate') {
          this.broadcastState  = data;
          this.activeBookingId = data.deliveryId ?? this.activeBookingId;
          if (data.status === 'accepted') {
            this.bookingStep = 'booked';
            this.loadData();
          } else if (this.bookingStep !== 'booked') {
            this.bookingStep = 'booked';
          }
          this.cdr.detectChanges();
        }
        if (event === 'statusUpdate') {
          this.loadData();
        }
        if (event === 'chatMessage') {
          if (this.showChat && data.deliveryId === this.chatDeliveryId) {
            // Chat window is open for this delivery — render immediately
            if (!this.chatMessages.some((m: ChatMsg) => m.id === data.id)) {
              this.chatMessages = [...this.chatMessages, data];
              this.cdr.detectChanges();
              this.scrollChatToBottom();
            }
          } else {
            // Chat window is closed or showing a different delivery — count as unread
            // and make sure we're subscribed so future messages keep arriving
            this.chatUnreadCount++;
            this.sseService.subscribeToChat(data.deliveryId);
            this.cdr.detectChanges();
          }
        }
      }
    });
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
      deliveries: this.deliveryService.getUserDeliveries(this.user.userId)
                    .pipe(catchError(() => of([]))),
      wallet:     this.walletService.getWalletByUserId(this.user.userId)
                    .pipe(catchError(() => of({ balance: 0 }))),
    }).subscribe({
      next: ({ deliveries, wallet }) => {
        this.deliveries = [...deliveries].reverse();
        this.wallet     = wallet;
        this.extractRecentLocations(deliveries);
        // Bug 3 fix: restore broadcast bar after reload if there's an active PENDING order
        if (this.bookingStep !== 'booked') {
          const pending = deliveries.find((d: any) =>
            (d.status || '').toUpperCase() === 'PENDING');
          if (pending) {
            this.bookingStep     = 'booked';
            this.activeBookingId = pending.deliveryId ?? null;
            if (!this.broadcastState) {
              this.broadcastState = {
                status:          'searching',
                deliveryId:      pending.deliveryId,
                totalPool:       pending.totalPool       ?? 0,
                totalNotified:   pending.totalNotified   ?? 0,
                rejected:        pending.totalRejected   ?? 0,
                pending:         Math.max(0, (pending.totalNotified ?? 0) - (pending.totalRejected ?? 0)),
                progressPercent: pending.totalNotified
                  ? Math.round((pending.totalNotified * 100) / Math.max(pending.totalPool ?? 1, 1))
                  : 0,
              };
            }
          }
        }
        // Auto-subscribe to chat for every active delivery that has a porter assigned.
        // This ensures the user receives real-time messages even before opening the chat window.
        const activeStatuses = ['ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP'];
        deliveries
          .filter((d: any) => d.commuterId && activeStatuses.includes((d.status || '').toUpperCase()))
          .forEach((d: any) => this.sseService.subscribeToChat(d.deliveryId));

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

  /* ─────────────── Map picker ─────────────── */

  openMapPicker(): void  { this.showMapPicker = true; }
  closeMapPicker(): void { this.showMapPicker = false; }

  onMapConfirm(result: MapPickerResult): void {
    this.showMapPicker = false;
    this.locationError = '';
    this.pickupAddress = result.pickupAddress;
    this.pickupLat     = result.pickupLat;
    this.pickupLng     = result.pickupLng;
    this.dropAddress   = result.dropAddress;
    this.dropLat       = result.dropLat;
    this.dropLng       = result.dropLng;
    this.estimatedDist = result.distanceKm;
    this.fetchFareEstimate(result.pickupLat, result.pickupLng, result.dropLat, result.dropLng);
    this.renderInlineMap();
  }

  /* ─────────────── Fare estimation (Feature 1) ─────────────── */

  private fetchFareEstimate(pLat: number, pLng: number, dLat: number, dLng: number): void {
    this.fareLoading  = true;
    this.fareError    = '';
    this.fareEstimate = null;
    this.cdr.detectChanges();
    this.fareService.estimate(pLat, pLng, dLat, dLng, this.vehicleType)
      .pipe(catchError(err => {
        console.error('Fare API error', err);
        return of(null);
      }))
      .subscribe({
        next: (est) => {
          this.fareLoading = false;
          if (est) {
            this.fareEstimate   = est;
            this.estimatedDist  = est.distanceKm;
            this.basePrice      = est.baseFare;
            this.distanceCost   = est.distanceFare;
            this.serviceFee     = est.timeFare + est.zoneSurcharge;
            this.estimatedPrice = est.totalFare;
            this.fareError      = '';
            this.showPriceCard  = true;
            this.bookingStep    = 'estimated';
          } else {
            this.fareError   = 'Could not reach fare server. Check your connection and try again.';
            this.showPriceCard = false;
            this.bookingStep   = 'idle';
          }
          this.cdr.detectChanges();
        }
      });
  }

  async estimatePrice(): Promise<void> {
    this.locationError = '';
    if (!this.pickupAddress.trim() || !this.dropAddress.trim()) return;

    // Auto-geocode any unresolved address before proceeding
    if (this.pickupLat === undefined) {
      const c = await this.geocodeSingle(this.pickupAddress);
      if (c) { this.pickupLat = c.lat; this.pickupLng = c.lng; }
    }
    if (this.dropLat === undefined) {
      const c = await this.geocodeSingle(this.dropAddress);
      if (c) { this.dropLat = c.lat; this.dropLng = c.lng; }
    }

    if (this.pickupLat !== undefined && this.dropLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat, this.pickupLng!, this.dropLat, this.dropLng!);
      this.renderInlineMap();
      return;
    }

    // Still no coordinates — open map picker as last resort
    this.locationError = 'Could not find those addresses. Please pin locations on the map.';
    this.showMapPicker = true;
    this.cdr.detectChanges();
  }

  private applyFallbackFare(): void {
    this.basePrice      = 50;
    this.distanceCost   = 0;
    this.serviceFee     = 0;
    this.estimatedPrice = 50;
    this.showPriceCard  = true;
    this.bookingStep    = 'estimated';
    this.cdr.detectChanges();
  }

  onVehicleTypeChange(): void {
    // Re-fetch fare if coordinates are already available
    if (this.pickupLat !== undefined && this.dropLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat, this.pickupLng!, this.dropLat, this.dropLng!);
    }
  }

  /* ── Surge confirmation dialog ── */
  get hasSurge(): boolean {
    return !!(this.fareEstimate?.hasSurge && (this.fareEstimate?.surgeMultiplier ?? 1) > 1.3);
  }

  openSurgeConfirm(): void  { this.showSurgeConfirm = true; }
  cancelSurgeConfirm(): void { this.showSurgeConfirm = false; }

  confirmSurgeAndBook(): void {
    this.showSurgeConfirm = false;
    this.bookDelivery();
  }

  onBookClick(): void {
    if (this.hasSurge) { this.openSurgeConfirm(); return; }
    this.bookDelivery();
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
      vehicleType:         this.vehicleType,
      distanceKm:          this.fareEstimate?.distanceKm ?? this.estimatedDist ?? 5,
      basePrice:           this.fareEstimate?.baseFare   ?? this.basePrice     ?? 40,
      distanceCost:        this.fareEstimate?.distanceFare ?? this.distanceCost ?? 0,
      serviceFee:          this.fareEstimate ? (this.fareEstimate.timeFare + this.fareEstimate.zoneSurcharge) : this.serviceFee,
      totalAmount:         this.fareEstimate?.totalFare ?? this.estimatedPrice ?? 150,
      surgeMultiplier:     this.fareEstimate?.surgeMultiplier ?? 1.0,
      surgeLabel:          this.fareEstimate?.surgeLabel ?? 'Normal',
      status:              'PENDING',
      deliveryType:        'STANDARD',
    };

    this.deliveryService.createDelivery(payload).subscribe({
      next: (created: any) => {
        // Feature 5: start broadcast state while searching for porter
        this.broadcastState  = { status: 'searching', totalPool: 0, totalNotified: 0, rejected: 0, pending: 0, progressPercent: 0 };
        this.activeBookingId = created?.deliveryId ?? null;
        this.bookingStep     = 'booked';
        this.saveRecentLocation(this.pickupAddress);
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
    this.showPriceCard = false; this.estimatedPrice = 0;
    this.fareEstimate = null; this.fareError = ''; this.locationError = '';
    this.bookingStep = 'idle';
    this.broadcastState = null; this.activeBookingId = null;
  }

  isCancelling = false;

  cancelBooking(): void {
    if (!this.activeBookingId || this.isCancelling) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    this.isCancelling = true;
    this.deliveryService.updateDeliveryStatus(this.activeBookingId, 'CANCELLED')
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.isCancelling = false;
        this.resetForm();
        this.loadData();
        this.cdr.detectChanges();
      });
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

  /* ── Broadcast helpers (Feature 5) ── */
  get broadcastStatus(): any { return this.broadcastState?.status ?? 'searching'; }
  get broadcastPct(): number    { return this.broadcastState?.progressPercent ?? 0; }
  get broadcastPending(): number { return this.broadcastState?.pending ?? 0; }

  /* ─────────────── Delivery detail drawer ─────────────── */

  openDeliveryDetail(d: any): void {
    this.selectedDelivery   = d;
    this.showDeliveryDetail = true;
    this.cdr.detectChanges();
  }

  closeDeliveryDetail(): void {
    this.showDeliveryDetail = false;
    this.selectedDelivery   = null;
  }

  /* ─────────────── OTP reveal (summary card) ─────────────── */
  // Tracks which delivery's OTP is currently revealed on the summary card.
  // Only one at a time; tapping again hides it.
  otpRevealedId: number | null = null;

  toggleOtpReveal(deliveryId: number, event: Event): void {
    event.stopPropagation(); // don't open the detail modal
    this.otpRevealedId = this.otpRevealedId === deliveryId ? null : deliveryId;
    this.cdr.detectChanges();
  }

  /* ─────────────── Section nav ─────────────── */

  setSection(s: ActiveSection): void {
    this.activeSection = s;
    if (s === 'intercity' && this.intercityCouriers.length === 0) {
      this.loadIntercityCouriers();
    }
    this.cdr.detectChanges();
    this.mainContentRef?.nativeElement.scrollTo({ top: 0 });
  }

  loadIntercityCouriers(): void {
    this.intercityLoading = true;
    this.intercityError   = '';
    this.intercityService.getCouriers().subscribe({
      next: (data) => {
        this.allIntercityCouriers = data;
        this.intercityLoading     = false;
        this.applyIntercityFilters();
      },
      error: () => {
        this.intercityError   = 'Failed to load courier services. Please try again.';
        this.intercityLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  searchIntercity(): void {
    this.applyIntercityFilters();
  }

  applyIntercityFilters(): void {
    let result = [...this.allIntercityCouriers];

    const from = this.intercityFromCity.trim().toLowerCase();
    const to   = this.intercityToCity.trim().toLowerCase();
    if (from) result = result.filter(c => c.cities.some(city => city.toLowerCase().includes(from)));
    if (to)   result = result.filter(c => c.cities.some(city => city.toLowerCase().includes(to)));

    if (this.intercitySortBy === 'price')  result.sort((a, b) => a.basePrice - b.basePrice);
    if (this.intercitySortBy === 'speed')  result.sort((a, b) => a.estimatedDays.localeCompare(b.estimatedDays));
    if (this.intercitySortBy === 'rating') result.sort((a, b) => b.rating - a.rating);

    this.intercityCouriers = result;
    this.cdr.detectChanges();
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  formatReviews(reviews: number): string {
    if (reviews >= 1000) return (reviews / 1000).toFixed(1) + 'k';
    return reviews.toString();
  }

  /* ─────────────── Delivery display helpers ─────────────── */

  getDeliveryId(d: any): string {
    const id   = d.deliveryId ?? d.id ?? 0;
    const year = new Date().getFullYear();
    return `CG-${year}-${String(id).padStart(3, '0')}`;
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':          return 'status-pending';
      case 'ACCEPTED':         return 'status-accepted';
      case 'ARRIVED_AT_PICKUP': return 'status-arrived';
      case 'PICKED_UP':        return 'status-transit';
      case 'DELIVERED':        return 'status-delivered';
      case 'CANCELLED':        return 'status-cancelled';
      default:                 return 'status-pending';
    }
  }

  getStatusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':          return 'Searching';
      case 'ACCEPTED':         return 'Porter En Route';
      case 'ARRIVED_AT_PICKUP': return 'Porter Arrived';
      case 'PICKED_UP':        return 'In Transit';
      case 'DELIVERED':        return 'Delivered';
      case 'CANCELLED':        return 'Cancelled';
      default:                 return status;
    }
  }

  getActiveDeliveries(): any[] {
    return this.deliveries.filter(d =>
      ['PENDING', 'ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP'].includes((d.status || '').toUpperCase())
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

    this.walletService.topUp(this.user.userId, amt).pipe(catchError(() => of(null))).subscribe(() => {
      this.addTxn({ type: 'credit', amount: amt, description: 'Added to Wallet', method: methodLabel });
      this.addMoneyStep = 'success';
      // Re-fetch wallet from server so the nav chip shows the actual server balance
      this.walletService.getWalletByUserId(this.user.userId)
        .pipe(catchError(() => of(null)))
        .subscribe(w => {
          if (w) this.wallet = w;
          this.cdr.detectChanges();
        });
      this.cdr.detectChanges();
    });
  }

  finishAddMoney(): void { this.showAddMoneyModal = false; }

  txnIcon(t: WalletTxn): string { return t.type === 'credit' ? '↓' : '↑'; }

  /* ─────────────── Profile dropdown ─────────────── */

  toggleProfileDrop(): void { this.profileDropOpen = !this.profileDropOpen; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.profile-section')) this.profileDropOpen = false;
  }

  logout(): void { this.authService.logout(); }

  /* ─────────────── Address Autocomplete ─────────────── */

  onPickupInput(): void {
    this.showPriceCard = false;
    this.bookingStep   = 'idle';
    this.pickupLat     = undefined;
    this.pickupLng     = undefined;
    this.locationError = '';
    clearTimeout(this.pickupDebounce);
    if (this.pickupAddress.length < 3) { this.pickupSuggestions = []; this.showPickupSugg = false; return; }
    this.pickupDebounce = setTimeout(() => this.fetchSuggestions('pickup', this.pickupAddress), 400);
  }

  onDropInput(): void {
    this.showPriceCard = false;
    this.bookingStep   = 'idle';
    this.dropLat       = undefined;
    this.dropLng       = undefined;
    this.locationError = '';
    clearTimeout(this.dropDebounce);
    if (this.dropAddress.length < 3) { this.dropSuggestions = []; this.showDropSugg = false; return; }
    this.dropDebounce = setTimeout(() => this.fetchSuggestions('drop', this.dropAddress), 400);
  }

  private async fetchSuggestions(field: 'pickup' | 'drop', query: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=0`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      if (field === 'pickup') { this.pickupSuggestions = data; this.showPickupSugg = data.length > 0; }
      else                    { this.dropSuggestions   = data; this.showDropSugg   = data.length > 0; }
      this.cdr.detectChanges();
    } catch {}
  }

  selectPickupSuggestion(s: NominatimResult): void {
    this.pickupAddress = s.display_name;
    this.pickupLat     = parseFloat(s.lat);
    this.pickupLng     = parseFloat(s.lon);
    this.pickupSuggestions = [];
    this.showPickupSugg    = false;
    if (this.dropLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat, this.pickupLng, this.dropLat!, this.dropLng!);
      this.renderInlineMap();
    }
    this.cdr.detectChanges();
  }

  selectDropSuggestion(s: NominatimResult): void {
    this.dropAddress = s.display_name;
    this.dropLat     = parseFloat(s.lat);
    this.dropLng     = parseFloat(s.lon);
    this.dropSuggestions = [];
    this.showDropSugg    = false;
    if (this.pickupLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat!, this.pickupLng!, this.dropLat, this.dropLng);
      this.renderInlineMap();
    }
    this.cdr.detectChanges();
  }

  hidePickupSugg(): void {
    setTimeout(() => {
      this.showPickupSugg = false;
      if (this.pickupAddress.trim() && this.pickupLat === undefined) this.autoGeocodePickup();
      this.cdr.detectChanges();
    }, 150);
  }

  hideDropSugg(): void {
    setTimeout(() => {
      this.showDropSugg = false;
      if (this.dropAddress.trim() && this.dropLat === undefined) this.autoGeocodeDrop();
      this.cdr.detectChanges();
    }, 150);
  }

  private async autoGeocodePickup(): Promise<void> {
    const coord = await this.geocodeSingle(this.pickupAddress);
    if (!coord) return;
    this.pickupLat = coord.lat;
    this.pickupLng = coord.lng;
    if (this.dropLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat, this.pickupLng, this.dropLat, this.dropLng!);
      this.renderInlineMap();
    }
    this.cdr.detectChanges();
  }

  private async autoGeocodeDrop(): Promise<void> {
    const coord = await this.geocodeSingle(this.dropAddress);
    if (!coord) return;
    this.dropLat = coord.lat;
    this.dropLng = coord.lng;
    if (this.pickupLat !== undefined) {
      this.fetchFareEstimate(this.pickupLat!, this.pickupLng!, this.dropLat, this.dropLng);
      this.renderInlineMap();
    }
    this.cdr.detectChanges();
  }

  private async geocodeSingle(address: string): Promise<{lat: number; lng: number} | null> {
    if (!isPlatformBrowser(this.platformId) || !address.trim()) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1&countrycodes=in`;
      const data: any[] = await fetch(url, { headers: { 'Accept-Language': 'en' } }).then(r => r.json());
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {}
    return null;
  }

  async renderInlineMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.pickupLat === undefined || this.dropLat === undefined) return;

    // Wait a tick for *ngIf to render the map container
    await new Promise(r => setTimeout(r, 80));
    const el = this.inlineMapElRef?.nativeElement;
    if (!el) return;

    if (!this.leafletLib) {
      this.leafletLib = await import('leaflet');
      delete (this.leafletLib.Icon.Default.prototype as any)._getIconUrl;
      this.leafletLib.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
    const L = this.leafletLib;

    this.inlineMapInstance?.remove();
    const map = L.map(el, { zoomControl: false, attributionControl: false })
      .setView([this.pickupLat!, this.pickupLng!], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    this.inlineMapInstance = map;

    const greenDot = L.divIcon({ className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      iconSize: [12,12], iconAnchor: [6,6] });
    const redDot = L.divIcon({ className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      iconSize: [12,12], iconAnchor: [6,6] });

    L.marker([this.pickupLat!, this.pickupLng!], { icon: greenDot }).addTo(map);
    L.marker([this.dropLat!,   this.dropLng!],   { icon: redDot   }).addTo(map);
    map.fitBounds([[this.pickupLat!, this.pickupLng!],[this.dropLat!, this.dropLng!]], { padding: [28,28] });

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${this.pickupLng},${this.pickupLat};${this.dropLng},${this.dropLat}?overview=full&geometries=geojson`;
      const resp: any = await fetch(url).then(r => r.json());
      if (resp.routes?.[0]) {
        L.geoJSON(resp.routes[0].geometry, { style: { color: '#2563eb', weight: 3.5, opacity: 0.8 } }).addTo(map);
        map.fitBounds(L.geoJSON(resp.routes[0].geometry).getBounds(), { padding: [28,28] });
        this.inlineRouteDist = (resp.routes[0].distance / 1000).toFixed(1);
        this.inlineRouteDur  = String(Math.round(resp.routes[0].duration / 60));
        this.cdr.detectChanges();
      }
    } catch {}
  }

  /* ─────────────── Chat ─────────────── */

  openChat(d: any): void {
    this.chatDelivery    = d;
    this.chatDeliveryId  = d.deliveryId;
    this.chatMessages    = [];
    this.showChat        = true;
    this.chatUnreadCount = 0;   // clear the unread badge
    this.http.get<ChatMsg[]>(`${this.apiBase}/chat/${d.deliveryId}`)
      .pipe(catchError(() => of([] as ChatMsg[])))
      .subscribe(msgs => {
        this.chatMessages = msgs;
        this.cdr.detectChanges();
        this.scrollChatToBottom();
      });
    this.sseService.subscribeToChat(d.deliveryId);
  }

  closeChat(): void {
    if (this.chatDeliveryId) this.sseService.unsubscribeFromChat(this.chatDeliveryId);
    this.showChat       = false;
    this.chatDeliveryId = null;
    this.chatDelivery   = null;
    this.chatMessages   = [];
    this.chatInput      = '';
  }

  sendChatMessage(): void {
    const msg = this.chatInput.trim();
    if (!msg || !this.chatDeliveryId || this.chatSending) return;
    this.chatSending = true;
    const body = { senderId: String(this.user.userId), senderName: this.user.name, senderRole: 'USER', message: msg };
    this.http.post<ChatMsg>(`${this.apiBase}/chat/${this.chatDeliveryId}/send`, body)
      .pipe(catchError(() => of(null)))
      .subscribe(saved => {
        // Dedup: WebSocket broadcast may arrive before the HTTP response —
        // only add if not already in the list (prevents double-render)
        if (saved && !this.chatMessages.some((m: ChatMsg) => m.id === saved.id)) {
          this.chatMessages = [...this.chatMessages, saved];
        }
        this.chatInput   = '';
        this.chatSending = false;
        this.cdr.detectChanges();
        this.scrollChatToBottom();
      });
  }

  onChatKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const el = this.chatScrollRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  canChat(d: any): boolean {
    return !!d.commuterId && ['ACCEPTED','ARRIVED_AT_PICKUP','PICKED_UP'].includes((d.status || '').toUpperCase());
  }

  /* ─────────────── Commuter routing ─────────────── */

  isPorter(): boolean {
    const role: string = this.user?.role ?? '';
    return role.split(',').map((r: string) => r.trim().toLowerCase()).includes('porter');
  }

  goToCommuter(): void {
    if (this.isPorter()) {
      if (this.user?.userId) this.router.navigate(['/porter-dashboard', this.user.userId]);
    } else {
      this.router.navigate(['/commuter-register']);
    }
  }
}
