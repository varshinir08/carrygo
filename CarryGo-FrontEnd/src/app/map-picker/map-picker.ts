import {
  Component, EventEmitter, Output, OnInit, OnDestroy, OnChanges, SimpleChanges,
  AfterViewInit, Input, ViewChild, ElementRef, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface MapPickerResult {
  pickupAddress: string;
  pickupLat:     number;
  pickupLng:     number;
  dropAddress:   string;
  dropLat:       number;
  dropLng:       number;
  distanceKm:    number;
  durationMin:   number;
}

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-picker.html',
  styleUrl:    './map-picker.css',
})
export class MapPickerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  /** Parent controls visibility — no *ngIf needed on the host */
  @Input() isOpen = false;

  @Output() confirmed = new EventEmitter<MapPickerResult>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('mapEl') mapElRef!: ElementRef<HTMLDivElement>;

  /* ── Phase ── */
  phase: 'pickup' | 'drop' = 'pickup';

  /* ── Pickup ── */
  pickupAddress = '';
  pickupLat?: number;
  pickupLng?: number;

  /* ── Drop ── */
  dropAddress = '';
  dropLat?: number;
  dropLng?: number;

  /* ── Route info ── */
  distanceKm  = 0;
  durationMin = 0;
  isRouting   = false;

  /* ── Search ── */
  searchQuery   = '';
  suggestions:  any[] = [];
  isSearching   = false;
  showSuggestions = false;

  /* ── Leaflet internals (any — loaded dynamically) ── */
  private L:              any;
  private map:            any;
  private pickupMarker:   any;
  private dropMarker:     any;
  private routeLayer:     any;
  private mapReady        = false;
  private leafletLoaded   = false;
  private pendingMapInit  = false;

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];

  constructor(
    private http:     HttpClient,
    private cdr:      ChangeDetectorRef,
    private zone:     NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    const sub = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
    ).subscribe(q => {
      if (q.length >= 3) this.runSearch(q);
      else { this.suggestions = []; this.showSuggestions = false; this.cdr.detectChanges(); }
    });
    this.subs.push(sub);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.L = await import('leaflet');
    this.fixLeafletIcons();
    this.leafletLoaded = true;
    // DO NOT call initMap() here — the container is hidden (display:none via [hidden]="!isOpen")
    // and Leaflet cannot calculate the map size on a zero-dimension element.
    // initMap() will be called lazily the first time isOpen becomes true.
    if (this.pendingMapInit) {
      // isOpen turned true before Leaflet finished loading
      this.pendingMapInit = false;
      setTimeout(() => { this.initMap(); this.mapReady = true; }, 50);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) return;
    const nowOpen: boolean = changes['isOpen'].currentValue;
    if (nowOpen) {
      this.resetState();
      if (!this.leafletLoaded) {
        // Leaflet hasn't loaded yet — flag so ngAfterViewInit will init after load
        this.pendingMapInit = true;
      } else if (!this.mapReady) {
        // Leaflet loaded but map never initialised — container is now visible, init it
        setTimeout(() => {
          this.initMap();
          this.mapReady = true;
          setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 50);
        }, 50);
      } else {
        // Map already initialised — just recalculate size for the now-visible container
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize(true);
            this.cdr.detectChanges();
          }
        }, 80);
      }
    }
  }

  /* ─────────────── Map init ─────────────── */

  private fixLeafletIcons(): void {
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }

  private initMap(): void {
    if (!this.mapElRef?.nativeElement) return;
    this.map = this.L.map(this.mapElRef.nativeElement, {
      center:      [20.5937, 78.9629],
      zoom:        5,
      zoomControl: true,
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.map.setView([pos.coords.latitude, pos.coords.longitude], 13);
          this.cdr.detectChanges();
        },
        () => {},
        { timeout: 5000 },
      );
    }

    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      this.zone.run(() => this.handleMapClick(lat, lng));
    });
  }

  /* ─────────────── Reset state ─────────────── */

  private resetState(): void {
    this.phase = 'pickup';
    if (this.pickupMarker) { this.pickupMarker.remove(); this.pickupMarker = null; }
    if (this.dropMarker)   { this.dropMarker.remove();   this.dropMarker   = null; }
    if (this.routeLayer)   { this.routeLayer.remove();   this.routeLayer   = null; }
    this.pickupLat = this.pickupLng = this.dropLat = this.dropLng = undefined;
    this.pickupAddress = this.dropAddress = '';
    this.distanceKm = this.durationMin = 0;
    this.isRouting = false;
    this.clearSearch();
    this.cdr.detectChanges();
  }

  /* ─────────────── Map click / marker placement ─────────────── */

  private async handleMapClick(lat: number, lng: number): Promise<void> {
    const isPickup  = this.phase === 'pickup';
    const tempAddr  = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    // Place marker immediately for instant visual feedback
    if (isPickup) {
      this.applyPickup(lat, lng, tempAddr);
    } else {
      this.applyDrop(lat, lng, tempAddr);
    }
    // Then update with the real geocoded address in background
    const address = await this.reverseGeocode(lat, lng);
    if (isPickup) {
      this.pickupAddress = address;
    } else {
      this.dropAddress = address;
    }
    this.cdr.detectChanges();
  }

  private applyPickup(lat: number, lng: number, address: string): void {
    this.pickupLat = lat;
    this.pickupLng = lng;
    this.pickupAddress = address;
    this.placeMarker('pickup', lat, lng);
    this.phase = 'drop';
    this.clearSearch();
    if (this.dropLat !== undefined) this.fetchRoute();
    this.cdr.detectChanges();
  }

  private applyDrop(lat: number, lng: number, address: string): void {
    this.dropLat = lat;
    this.dropLng = lng;
    this.dropAddress = address;
    this.placeMarker('drop', lat, lng);
    this.clearSearch();
    if (this.pickupLat !== undefined) this.fetchRoute();
    this.cdr.detectChanges();
  }

  private placeMarker(type: 'pickup' | 'drop', lat: number, lng: number): void {
    if (type === 'pickup') {
      if (this.pickupMarker) this.pickupMarker.remove();
      this.pickupMarker = this.L.marker([lat, lng], { icon: this.dotIcon('#22c55e') })
        .addTo(this.map)
        .bindPopup('<b>📍 Pickup</b>').openPopup();
    } else {
      if (this.dropMarker) this.dropMarker.remove();
      this.dropMarker = this.L.marker([lat, lng], { icon: this.dotIcon('#f97316') })
        .addTo(this.map)
        .bindPopup('<b>🏁 Drop-off</b>').openPopup();
    }
  }

  private dotIcon(color: string): any {
    return this.L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:24px;height:24px;">
          <div style="
            position:absolute;top:2px;left:2px;
            width:20px;height:20px;border-radius:50%;
            background:${color};border:3px solid #fff;
            box-shadow:0 2px 10px rgba(0,0,0,0.35);">
          </div>
          <div style="
            position:absolute;top:-2px;left:-2px;
            width:28px;height:28px;border-radius:50%;
            background:${color};opacity:0.25;
            animation:mapPulse 1.8s ease-in-out infinite;">
          </div>
        </div>`,
      iconSize:   [24, 24],
      iconAnchor: [12, 12],
    });
  }

  /* ─────────────── OSRM Routing ─────────────── */

  private fetchRoute(): void {
    if (this.pickupLat === undefined || this.dropLat === undefined) return;
    this.isRouting = true;
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${this.pickupLng},${this.pickupLat};${this.dropLng},${this.dropLat}` +
      `?overview=full&geometries=geojson`;

    this.http.get<any>(url).subscribe({
      next: res => {
        if (res?.routes?.length) {
          const route = res.routes[0];
          this.distanceKm  = Math.round(route.distance / 100) / 10;
          this.durationMin = Math.round(route.duration  / 60);

          if (this.routeLayer) this.routeLayer.remove();
          this.routeLayer = this.L.geoJSON(route.geometry, {
            style: { color: '#f97316', weight: 5, opacity: 0.75, dashArray: '' },
          }).addTo(this.map);
          this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
        }
        this.isRouting = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isRouting = false; this.cdr.detectChanges(); },
    });
  }

  /* ─────────────── Nominatim Search ─────────────── */

  onSearchInput(q: string): void {
    this.searchSubject.next(q);
  }

  private runSearch(query: string): void {
    this.isSearching = true;
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=in`;

    this.http.get<any[]>(url, { headers: { 'Accept-Language': 'en' } }).subscribe({
      next: results => {
        this.suggestions    = results;
        this.showSuggestions = results.length > 0;
        this.isSearching    = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isSearching = false; this.cdr.detectChanges(); },
    });
  }

  selectSuggestion(s: any): void {
    const lat  = parseFloat(s.lat);
    const lng  = parseFloat(s.lon);
    const addr = s.display_name;
    this.clearSearch();
    this.map.setView([lat, lng], 15);
    this.phase === 'pickup'
      ? this.applyPickup(lat, lng, addr)
      : this.applyDrop(lat, lng, addr);
  }

  closeSuggestions(): void {
    setTimeout(() => { this.showSuggestions = false; this.cdr.detectChanges(); }, 180);
  }

  /* ─────────────── Reverse geocode ─────────────── */

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res: any = await this.http.get<any>(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } },
      ).toPromise();
      return res?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  /* ─────────────── Reset / Phase switch ─────────────── */

  switchPhase(p: 'pickup' | 'drop'): void {
    this.phase = p;
    this.clearSearch();
  }

  resetPickup(): void {
    if (this.pickupMarker) { this.pickupMarker.remove(); this.pickupMarker = null; }
    this.pickupLat = this.pickupLng = undefined;
    this.pickupAddress = '';
    this.phase = 'pickup';
    this.clearRoute();
    this.cdr.detectChanges();
  }

  resetDrop(): void {
    if (this.dropMarker) { this.dropMarker.remove(); this.dropMarker = null; }
    this.dropLat = this.dropLng = undefined;
    this.dropAddress = '';
    this.phase = 'drop';
    this.clearRoute();
    this.cdr.detectChanges();
  }

  private clearRoute(): void {
    if (this.routeLayer) { this.routeLayer.remove(); this.routeLayer = null; }
    this.distanceKm = 0;
    this.durationMin = 0;
  }

  private clearSearch(): void {
    this.searchQuery    = '';
    this.suggestions    = [];
    this.showSuggestions = false;
  }

  /* ─────────────── Format helpers ─────────────── */

  shortAddress(addr: string): string {
    if (!addr) return '';
    const parts = addr.split(',');
    return parts.slice(0, 2).join(',').trim();
  }

  formatDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  estimatedFare(): number {
    const base = 40, perKm = 8, fee = 15;
    return Math.round(base + this.distanceKm * perKm + fee);
  }

  /* ─────────────── Confirm / Cancel ─────────────── */

  get canConfirm(): boolean {
    return (
      this.pickupLat !== undefined &&
      this.dropLat   !== undefined &&
      this.distanceKm > 0
    );
  }

  confirm(): void {
    if (!this.canConfirm) return;
    this.confirmed.emit({
      pickupAddress: this.pickupAddress,
      pickupLat:     this.pickupLat!,
      pickupLng:     this.pickupLng!,
      dropAddress:   this.dropAddress,
      dropLat:       this.dropLat!,
      dropLng:       this.dropLng!,
      distanceKm:    this.distanceKm,
      durationMin:   this.durationMin,
    });
  }

  cancel(): void { this.cancelled.emit(); }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.map) this.map.remove();
  }
}
