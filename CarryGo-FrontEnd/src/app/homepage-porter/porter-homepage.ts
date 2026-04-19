import {
  Component, OnInit, OnDestroy, HostListener,
  AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../services/user-service';
import { AuthService } from '../services/auth.service';
import { Delivery } from '../services/delivery/delivery';
import { PorterStatusService } from '../services/porter-status.service';
import { forkJoin, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
}

interface WalletData {
  walletId: number;
  userId: number;
  balance: number;
  lastUpdated: string;
}

type WithdrawMethod = 'upi' | 'netbanking' | 'bank';
type UpiApp = 'phonepe' | 'gpay' | 'bharatpe' | 'paytm' | 'other';

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

  porterProfile: PorterProfile | null = null;
  walletData: WalletData | null = null;
  isOnline      = false;
  isToggling    = false;
  statusToast   = '';
  earningsToday = 0;
  walletBalance = 0;
  notificationCount = 0;
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

  // Navigation map modal
  showNavMap        = false;
  navOrder:         DeliveryOrder | null = null;
  private navMapInstance: any  = null;
  private navMapLib:      any  = null;
  @ViewChild('navMapEl') navMapElRef!: ElementRef<HTMLDivElement>;

  // Withdraw modal
  showWithdrawModal = false;
  withdrawAmount    = '';
  withdrawMethod: WithdrawMethod = 'upi';
  selectedUpiApp: UpiApp | '' = '';
  upiId         = '';
  selectedBank  = '';
  accountNumber = '';
  ifscCode      = '';
  withdrawing   = false;
  withdrawSuccess = false;

  readonly upiApps: { id: UpiApp; label: string; color: string; logo: string }[] = [
    { id: 'phonepe',  label: 'PhonePe',   color: '#5f259f', logo: '📲' },
    { id: 'gpay',     label: 'Google Pay', color: '#4285f4', logo: '💳' },
    { id: 'bharatpe', label: 'BharatPe',  color: '#00bcd4', logo: '🏦' },
    { id: 'paytm',    label: 'Paytm',     color: '#002970', logo: '💰' },
    { id: 'other',    label: 'Other UPI', color: '#64748b', logo: '📱' },
  ];

  readonly banks = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
    'Canara Bank', 'Union Bank of India', 'IndusInd Bank',
  ];

  private pollSub: Subscription | null = null;
  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private userService:    UserService,
    private authService:    AuthService,
    private deliveryService: Delivery,
    private router:         Router,
    private http:           HttpClient,
    private statusService:  PorterStatusService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.buildWeekLabels();
    this.loadPorterData();
  }

  ngAfterViewInit(): void {
    // Charts are rendered after data loads; see renderCharts()
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.destroyCharts();
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
        this.isOnline = this.statusService.isOnline;
        this.generateInitials(profile.name);
        this.loadWallet(profile.userId);
        this.loadDeliveries(profile.userId);
        this.startPolling(profile.userId);
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
    forkJoin({
      mine:    this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/commuter/${userId}`),
      matched: this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${userId}`)
    }).subscribe({
      next: ({ mine, matched }) => {
        this.allDeliveries     = mine;
        this.activeOrders      = mine.filter(d => d.status === 'ACCEPTED' || d.status === 'PICKED_UP');
        this.orderRequests     = this.isOnline ? matched : [];
        this.activeOrdersCount = this.activeOrders.length;
        this.completedCount    = mine.filter(d => d.status === 'DELIVERED').length;
        this.todayDeliveries   = mine.length;
        this.notificationCount = this.isOnline ? matched.length : 0;
        this.buildChartData(mine);
        this.renderCharts();
      },
      error: () => {}
    });
  }

  startPolling(userId: number): void {
    this.pollSub = interval(30000).pipe(
      switchMap(() => this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${userId}`))
    ).subscribe({
      next: (matched) => {
        if (!this.isOnline) return;
        this.orderRequests     = matched;
        this.notificationCount = matched.length;
      }
    });
  }

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

      // Wait a tick for ViewChild refs to be available
      setTimeout(() => {
        this.buildDeliveriesChart();
        this.buildEarningsChart();
      }, 50);
    } catch (e) {
      console.warn('Chart.js load error', e);
    }
  }

  private buildDeliveriesChart(): void {
    const el = this.deliveriesChartRef?.nativeElement;
    if (!el || !this.chartLib) return;
    this.deliveriesChartInstance = new this.chartLib(el, {
      type: 'bar',
      data: {
        labels: this.weekLabels,
        datasets: [{
          label: 'Deliveries',
          data: this.weekDeliveries,
          backgroundColor: 'rgba(37,99,235,0.75)',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#64748b', font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          }
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
        datasets: [{
          label: '₹ Earnings',
          data: this.weekEarnings,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#7c3aed',
          pointRadius: 4,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#64748b', font: { size: 11 },
              callback: (v: any) => `₹${v}`
            },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  private destroyCharts(): void {
    this.deliveriesChartInstance?.destroy();
    this.earningsChartInstance?.destroy();
    this.deliveriesChartInstance = null;
    this.earningsChartInstance   = null;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleStatus(): void {
    if (!this.porterProfile || this.isToggling) return;
    this.isToggling = true;
    const newStatus = !this.isOnline;
    this.isOnline   = newStatus;
    this.statusService.set(newStatus);

    if (!newStatus) { this.orderRequests = []; this.notificationCount = 0; }

    this.statusToast = newStatus ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; }, 500);
    setTimeout(() => { this.statusToast = ''; }, 2800);

    this.userService.updatePorterStatus(this.porterProfile.userId, newStatus).subscribe({
      next: () => { if (newStatus) this.loadAvailableOrders(); },
      error: () => { if (newStatus) this.loadAvailableOrders(); }
    });
  }

  loadAvailableOrders(): void {
    if (!this.isOnline || !this.porterProfile) return;
    this.http.get<DeliveryOrder[]>(`${this.apiBase}/deliveries/matched/${this.porterProfile.userId}`).subscribe({
      next: (matched) => { this.orderRequests = matched; this.notificationCount = matched.length; },
      error: () => {}
    });
  }

  // ── Accept / Reject ───────────────────────────────────────────────────────
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
        this.notificationCount = this.orderRequests.length;
        // Auto-open navigation map — eliminates the separate "Navigate" tap
        this.openNavMap(merged);
      },
      error: () => { this.errorMessage = 'Failed to accept order.'; setTimeout(() => this.errorMessage = '', 3000); }
    });
  }

  rejectOrder(order: DeliveryOrder): void {
    this.orderRequests     = this.orderRequests.filter(o => o.deliveryId !== order.deliveryId);
    this.notificationCount = this.orderRequests.length;
  }

  markPickedUp(order: DeliveryOrder): void {
    this.http.patch<DeliveryOrder>(
      `${this.apiBase}/deliveries/${order.deliveryId}/status?status=PICKED_UP`, {}
    ).subscribe({
      next: (updated) => {
        const idx = this.activeOrders.findIndex(o => o.deliveryId === order.deliveryId);
        if (idx !== -1) this.activeOrders[idx] = updated;
      }
    });
  }

  markDelivered(order: DeliveryOrder): void {
    this.http.patch<DeliveryOrder>(
      `${this.apiBase}/deliveries/${order.deliveryId}/status?status=DELIVERED`, {}
    ).subscribe({
      next: () => {
        const earned        = order.totalAmount ?? 0;
        this.activeOrders   = this.activeOrders.filter(o => o.deliveryId !== order.deliveryId);
        this.activeOrdersCount = this.activeOrders.length;
        this.completedCount++;
        this.earningsToday += earned;
        this.walletBalance += earned;
        // Update chart
        this.weekDeliveries[6]++;
        this.weekEarnings[6] += earned;
        this.updateChartsData();
        if (this.porterProfile) this.loadWallet(this.porterProfile.userId);
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

  // ── Withdraw modal ────────────────────────────────────────────────────────
  openWithdraw(): void {
    this.withdrawAmount  = '';
    this.withdrawMethod  = 'upi';
    this.selectedUpiApp  = '';
    this.upiId           = '';
    this.selectedBank    = '';
    this.accountNumber   = '';
    this.ifscCode        = '';
    this.withdrawSuccess = false;
    this.showWithdrawModal = true;
  }

  closeWithdraw(): void { this.showWithdrawModal = false; }

  get withdrawMax(): number { return this.walletBalance; }

  get withdrawValid(): boolean {
    const amt = parseFloat(this.withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > this.walletBalance) return false;
    if (this.withdrawMethod === 'upi')        return !!this.selectedUpiApp && this.upiId.includes('@');
    if (this.withdrawMethod === 'netbanking') return !!this.selectedBank;
    if (this.withdrawMethod === 'bank')       return this.accountNumber.length >= 9 && this.ifscCode.length === 11;
    return false;
  }

  submitWithdraw(): void {
    if (!this.withdrawValid || this.withdrawing) return;
    this.withdrawing = true;
    // Simulate processing delay
    setTimeout(() => {
      const amt         = parseFloat(this.withdrawAmount);
      this.walletBalance -= amt;
      this.withdrawing   = false;
      this.withdrawSuccess = true;
      if (this.porterProfile) this.loadWallet(this.porterProfile.userId);
      setTimeout(() => this.closeWithdraw(), 2000);
    }, 1800);
  }

  // ── Navigation Map ────────────────────────────────────────────────────────
  openNavMap(order: DeliveryOrder): void {
    this.navOrder   = order;
    this.showNavMap = true;
    setTimeout(() => this.initNavMap(order), 80);
  }

  closeNavMap(): void {
    this.showNavMap = false;
    this.navMapInstance?.remove();
    this.navMapInstance = null;
    this.navOrder = null;
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
    this.navMapInstance?.remove();

    // Default center India
    const map = L.map(el, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    this.navMapInstance = map;

    // Geocode both addresses if no coords stored
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

    L.marker([pickupCoord.lat, pickupCoord.lng], { icon: greenIcon })
      .addTo(map)
      .bindPopup(`<b>Pickup</b><br>${order.pickupAddress}`)
      .openPopup();

    L.marker([dropCoord.lat, dropCoord.lng], { icon: redIcon })
      .addTo(map)
      .bindPopup(`<b>Drop</b><br>${order.dropAddress}`);

    // Fit bounds to show both
    const bounds = L.latLngBounds(
      [pickupCoord.lat, pickupCoord.lng],
      [dropCoord.lat,   dropCoord.lng]
    );
    map.fitBounds(bounds, { padding: [40, 40] });

    // Draw route via OSRM
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoord.lng},${pickupCoord.lat};${dropCoord.lng},${dropCoord.lat}?overview=full&geometries=geojson`;
      const resp: any = await fetch(url).then(r => r.json());
      if (resp.routes?.[0]) {
        L.geoJSON(resp.routes[0].geometry, {
          style: { color: '#2563eb', weight: 4, opacity: 0.85 }
        }).addTo(map);
        const dist = (resp.routes[0].distance / 1000).toFixed(1);
        const dur  = Math.round(resp.routes[0].duration / 60);
        if (this.navOrder) {
          (this.navOrder as any)._routeInfo = `${dist} km · ~${dur} min`;
        }
      }
    } catch {}
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } }).then(r => r.json());
      if (res[0]) return { lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon) };
    } catch {}
    return null;
  }

  getRouteInfo(order: DeliveryOrder): string {
    return (order as any)._routeInfo || '';
  }

  openInMaps(order: DeliveryOrder): void {
    const q = encodeURIComponent(`${order.pickupAddress} to ${order.dropAddress}`);
    window.open(`https://www.openstreetmap.org/directions?from=${encodeURIComponent(order.pickupAddress)}&to=${encodeURIComponent(order.dropAddress)}`, '_blank');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Single method drives the active-order lifecycle: ACCEPTED → PICKED_UP → DELIVERED
  nextAction(order: DeliveryOrder): void {
    if (order.status === 'ACCEPTED') this.markPickedUp(order);
    else if (order.status === 'PICKED_UP') this.markDelivered(order);
  }

  getActionLabel(order: DeliveryOrder): string {
    return order.status === 'PICKED_UP' ? 'Mark Delivered' : 'Confirm Pickup';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACCEPTED: 'Pending pickup', PICKED_UP: 'Picked up', DELIVERED: 'Delivered'
    };
    return map[status] ?? status;
  }

  isPickedUp(order: DeliveryOrder): boolean { return order.status === 'PICKED_UP'; }

  get weekTotalEarnings(): number  { return this.weekEarnings.reduce((a, b) => a + b, 0); }
  get weekTotalDeliveries(): number { return this.weekDeliveries.reduce((a, b) => a + b, 0); }

  navigate(section: string): void {
    this.activeSection = section;
    if (section === 'dashboard') {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  getFirstName(): string {
    const parts = this.porterProfile?.name?.split(' ');
    return parts?.length ? parts[0] : 'Porter';
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = document.querySelector('.profile-section');
    if (el && !el.contains(event.target as Node)) this.showProfileDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
