import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, HostListener, Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user-service';
import { PorterStatusService } from '../services/porter-status.service';

@Component({
  selector: 'porter-routes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './porter-routes.html',
  styleUrls: ['./porter-routes.css']
})
export class PorterRoutesComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('routeMapEl') routeMapElRef?: ElementRef<HTMLDivElement>;

  porterProfile: any = null;
  userInitials  = '';
  isOnline      = false;
  isToggling    = false;
  statusToast   = '';
  earningsToday = 0;
  showProfileDropdown = false;

  myRoutes: any[]  = [];
  showRouteModal   = false;
  isSavingRoute    = false;
  routePickStep: 'from' | 'to' = 'from';
  newRoute = { fromLocation: '', fromLat: 0, fromLng: 0,
               toLocation: '',   toLat: 0,   toLng: 0, departureTime: '' };

  private routeMapInstance: any = null;
  private routeFromMarker: any  = null;
  private routeToMarker: any    = null;
  private leafletLib: any       = null;
  private mapNeedsInit          = false;

  private readonly apiBase = 'http://localhost:8081/api';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private statusService: PorterStatusService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) { this.router.navigate(['/login']); return; }

    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (p: any) => {
        this.porterProfile = p;
        this.statusService.init(p.userId, p.isOnline ?? false);
        this.isOnline = this.statusService.isOnline;
        this.generateInitials(p.name);
        this.userService.getWalletByUserId(p.userId).subscribe({
          next: (w: any) => { this.earningsToday = w.balance ?? 0; }
        });
        this.loadRoutes(p.userId);
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  // ── AfterViewChecked: init map once the DOM element appears ──────────────
  ngAfterViewChecked(): void {
    if (this.mapNeedsInit && this.routeMapElRef?.nativeElement) {
      this.mapNeedsInit = false;
      // Small delay to ensure the element has dimensions
      setTimeout(() => this.initRouteMap(), 50);
    }
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  loadRoutes(userId: number): void {
    this.http.get<any[]>(`${this.apiBase}/routes/${userId}`).subscribe({
      next: (routes) => { this.myRoutes = routes; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  openRouteModal(): void {
    this.newRoute      = { fromLocation: '', fromLat: 0, fromLng: 0,
                           toLocation: '',   toLat: 0,   toLng: 0, departureTime: '' };
    this.routePickStep = 'from';
    this.routeFromMarker = null;
    this.routeToMarker   = null;
    this.destroyMap();
    this.showRouteModal = true;
    this.mapNeedsInit   = true;          // ngAfterViewChecked will fire init
    this.cdr.detectChanges();
  }

  closeRouteModal(): void {
    this.showRouteModal = false;
    this.mapNeedsInit   = false;
    this.destroyMap();
    this.cdr.detectChanges();
  }

  private destroyMap(): void {
    this.routeMapInstance?.remove();
    this.routeMapInstance = null;
    this.routeFromMarker  = null;
    this.routeToMarker    = null;
  }

  private async initRouteMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.routeMapElRef?.nativeElement;
    if (!el || el.clientHeight === 0) {
      // Element exists but has no height yet — retry
      setTimeout(() => this.initRouteMap(), 100);
      return;
    }

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
    this.destroyMap();

    const map = L.map(el, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    this.routeMapInstance = map;

    const greenIcon = L.divIcon({
      className: '',
      html: `<div style="width:13px;height:13px;border-radius:50%;background:#22c55e;border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3)"></div>`,
      iconSize: [13,13], iconAnchor: [6,6]
    });
    const redIcon = L.divIcon({
      className: '',
      html: `<div style="width:13px;height:13px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3)"></div>`,
      iconSize: [13,13], iconAnchor: [6,6]
    });

    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      const addr = await this.reverseGeocode(lat, lng);

      if (this.routePickStep === 'from') {
        this.newRoute.fromLat = lat;
        this.newRoute.fromLng = lng;
        this.newRoute.fromLocation = addr;
        this.routeFromMarker?.remove();
        this.routeFromMarker = L.marker([lat, lng], { icon: greenIcon })
          .addTo(map).bindPopup(`<b>Start:</b> ${addr}`).openPopup();
        this.routePickStep = 'to';
      } else {
        this.newRoute.toLat = lat;
        this.newRoute.toLng = lng;
        this.newRoute.toLocation = addr;
        this.routeToMarker?.remove();
        this.routeToMarker = L.marker([lat, lng], { icon: redIcon })
          .addTo(map).bindPopup(`<b>End:</b> ${addr}`).openPopup();
      }
      this.cdr.detectChanges();
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res: any = await fetch(url, { headers: { 'Accept-Language': 'en' } }).then(r => r.json());
      return res.display_name?.split(',').slice(0, 3).join(', ') ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  saveRoute(): void {
    if (!this.porterProfile || this.isSavingRoute) return;
    if (!this.newRoute.fromLocation || !this.newRoute.toLocation || !this.newRoute.departureTime) return;
    this.isSavingRoute = true;
    this.http.post<any>(`${this.apiBase}/routes/${this.porterProfile.userId}`, this.newRoute).subscribe({
      next: (saved) => {
        this.myRoutes = [...this.myRoutes, saved];
        this.isSavingRoute = false;
        this.closeRouteModal();
      },
      error: () => {
        this.isSavingRoute = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteRoute(routeId: number): void {
    this.http.delete(`${this.apiBase}/routes/${routeId}`).subscribe({
      next: () => { this.myRoutes = this.myRoutes.filter(r => r.routeId !== routeId); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  get canAddRoute(): boolean { return true; }

  // ── Header helpers ────────────────────────────────────────────────────────
  toggleStatus(): void {
    if (!this.porterProfile || this.isToggling) return;
    this.isToggling = true;
    const newStatus = !this.isOnline;
    const previousStatus = this.isOnline;
    this.isOnline = newStatus;
    if (this.porterProfile) this.porterProfile.isOnline = newStatus;
    this.statusService.set(newStatus);
    this.statusToast = this.isOnline ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; }, 600);
    setTimeout(() => { this.statusToast = ''; }, 2800);
    this.userService.updatePorterStatus(this.porterProfile.userId, this.isOnline).subscribe({
      next: (response) => {
        if (response) {
          this.porterProfile = response;
          this.isOnline = response.isOnline ?? newStatus;
          this.statusService.set(this.isOnline);
        }
      },
      error: () => {
        this.isOnline = previousStatus;
        if (this.porterProfile) this.porterProfile.isOnline = previousStatus;
        this.statusService.set(previousStatus);
        this.statusToast = 'Failed to update status';
      }
    });
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
  }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const el = document.querySelector('.profile-section');
    if (el && !el.contains(e.target as Node)) this.showProfileDropdown = false;
  }

  logout(): void { this.statusService.reset(); this.authService.logout(); this.router.navigate(['/login']); }
}
