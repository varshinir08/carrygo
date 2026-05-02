import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  Inject, PLATFORM_ID, HostListener, ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Delivery } from '../services/delivery/delivery';
import { MapPickerComponent, MapPickerResult } from '../map-picker/map-picker';
import { ChatbotComponent } from '../chatbot/chatbot';

type PackageSize  = 'small' | 'medium' | 'large';
type DeliveryType = 'standard' | 'express';

interface LocationSuggestion {
  address: string;
  lat?: number;
  lng?: number;
  type: 'history' | 'nominatim';
}

const HISTORY_KEY = 'carrygo_location_history';

@Component({
  selector: 'app-schedule-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapPickerComponent, ChatbotComponent],
  templateUrl: './schedule-delivery.html',
  styleUrl: './schedule-delivery.css',
})
export class ScheduleDeliveryComponent implements OnInit, OnDestroy {

  user: any = {};

  /* ── Pickup ── */
  pickupLocation = '';
  pickupLat?: number;
  pickupLng?: number;
  contactName    = '';
  contactPhone   = '';

  /* ── Drop ── */
  dropLocation   = '';
  dropLat?: number;
  dropLng?: number;
  receiverName   = '';
  receiverPhone  = '';

  /* ── Package ── */
  packageType    = '';
  weightKg       = 1;
  packageSize: PackageSize = 'medium';
  specialInstructions = '';

  /* ── Schedule / Delivery prefs ── */
  deliveryType: DeliveryType = 'standard';
  preferredDate  = '';
  preferredTime  = '';
  flexibleMatching = true;

  /* ── Price ── */
  distanceKm   = 0;
  basePrice    = 0;
  distanceCost = 0;
  serviceFee   = 0;
  totalPrice   = 0;

  /* ── State ── */
  searched      = false;
  isSubmitting  = false;
  showMapPicker = false;
  commuterCount = 0;

  /* ── Autocomplete ── */
  pickupSuggestions: LocationSuggestion[] = [];
  dropSuggestions:   LocationSuggestion[] = [];
  showPickupDrop = false;
  showDropDrop   = false;
  pickupLoading  = false;
  dropLoading    = false;

  private history:      LocationSuggestion[] = [];
  private pickupSearch$ = new Subject<string>();
  private dropSearch$   = new Subject<string>();
  private subs          = new Subscription();

  packageTypes = [
    { value: 'documents',   label: 'Documents',   icon: '📄' },
    { value: 'electronics', label: 'Electronics', icon: '💻' },
    { value: 'clothing',    label: 'Clothing',    icon: '👗' },
    { value: 'fragile',     label: 'Fragile',     icon: '🧊' },
    { value: 'food',        label: 'Food',        icon: '🍱' },
    { value: 'other',       label: 'Other',       icon: '📦' },
  ];

  packageSizes: { value: PackageSize; label: string; sub: string }[] = [
    { value: 'small',  label: 'Small',  sub: 'Up to 30cm' },
    { value: 'medium', label: 'Medium', sub: 'Up to 60cm' },
    { value: 'large',  label: 'Large',  sub: 'Up to 100cm' },
  ];

  isLoadingCommuters = false;

  /* Min date = today */
  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get scheduledLabel(): string {
    if (!this.preferredDate) return '';
    const d = new Date(this.preferredDate);
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateStr = d.toLocaleDateString('en-IN', opts);
    return this.preferredTime ? `${dateStr} at ${this.preferredTime}` : dateStr;
  }

  constructor(
    private authService:     AuthService,
    private deliveryService: Delivery,
    private router:          Router,
    private http:            HttpClient,
    private cdr:             ChangeDetectorRef,
    private elRef:           ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser() ?? {};
    this.loadHistory();
    this.setupPickupSearch();
    this.setupDropSearch();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.showPickupDrop = false;
      this.showDropDrop   = false;
    }
  }

  /* ── History ── */
  private loadHistory(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      this.history = raw ? JSON.parse(raw) : [];
    } catch { this.history = []; }
  }

  private saveToHistory(addr: string, lat?: number, lng?: number): void {
    if (!isPlatformBrowser(this.platformId) || !addr.trim()) return;
    this.history = this.history.filter(h => h.address.toLowerCase() !== addr.toLowerCase());
    this.history.unshift({ address: addr, lat, lng, type: 'history' });
    if (this.history.length > 10) this.history.length = 10;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history)); } catch {}
  }

  private filterHistory(q: string): LocationSuggestion[] {
    return this.history.filter(h => h.address.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 3).map(h => ({ ...h, type: 'history' as const }));
  }

  private nominatimSearch(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4&countrycodes=in`;
    return this.http.get<any[]>(url, { headers: { 'Accept-Language': 'en' } }).pipe(catchError(() => of([])));
  }

  private toSuggestions(results: any[]): LocationSuggestion[] {
    return results.map(r => ({
      address: r.display_name as string,
      lat: parseFloat(r.lat), lng: parseFloat(r.lon),
      type: 'nominatim' as const,
    }));
  }

  /* ── Pickup autocomplete ── */
  private setupPickupSearch(): void {
    const sub = this.pickupSearch$.pipe(
      debounceTime(350), distinctUntilChanged(),
      switchMap(q => { if (q.length < 2) { this.pickupLoading = false; return of([]); } this.pickupLoading = true; return this.nominatimSearch(q); })
    ).subscribe(results => {
      this.pickupLoading = false;
      const live = this.toSuggestions(results as any[]);
      const hist = this.filterHistory(this.pickupLocation);
      this.pickupSuggestions = [...hist, ...live.filter(l => !hist.some(h => h.address === l.address))];
      this.showPickupDrop = this.pickupSuggestions.length > 0;
      this.cdr.detectChanges();
    });
    this.subs.add(sub);
  }

  onPickupInput(): void {
    this.searched = false; this.pickupLat = undefined; this.pickupLng = undefined;
    const q = this.pickupLocation.trim();
    if (!q) { this.pickupSuggestions = this.history.slice(0, 5).map(h => ({ ...h, type: 'history' as const })); this.showPickupDrop = this.pickupSuggestions.length > 0; return; }
    this.pickupSearch$.next(q);
  }

  onPickupFocus(): void {
    if (!this.pickupLocation.trim()) { this.pickupSuggestions = this.history.slice(0, 5).map(h => ({ ...h, type: 'history' as const })); this.showPickupDrop = this.pickupSuggestions.length > 0; }
    else { this.showPickupDrop = this.pickupSuggestions.length > 0; }
  }

  selectPickup(s: LocationSuggestion): void {
    this.pickupLocation = s.address; this.pickupLat = s.lat; this.pickupLng = s.lng;
    this.showPickupDrop = false; this.pickupSuggestions = [];
  }

  /* ── Drop autocomplete ── */
  private setupDropSearch(): void {
    const sub = this.dropSearch$.pipe(
      debounceTime(350), distinctUntilChanged(),
      switchMap(q => { if (q.length < 2) { this.dropLoading = false; return of([]); } this.dropLoading = true; return this.nominatimSearch(q); })
    ).subscribe(results => {
      this.dropLoading = false;
      const live = this.toSuggestions(results as any[]);
      const hist = this.filterHistory(this.dropLocation);
      this.dropSuggestions = [...hist, ...live.filter(l => !hist.some(h => h.address === l.address))];
      this.showDropDrop = this.dropSuggestions.length > 0;
      this.cdr.detectChanges();
    });
    this.subs.add(sub);
  }

  onDropInput(): void {
    this.searched = false; this.dropLat = undefined; this.dropLng = undefined;
    const q = this.dropLocation.trim();
    if (!q) { this.dropSuggestions = this.history.slice(0, 5).map(h => ({ ...h, type: 'history' as const })); this.showDropDrop = this.dropSuggestions.length > 0; return; }
    this.dropSearch$.next(q);
  }

  onDropFocus(): void {
    if (!this.dropLocation.trim()) { this.dropSuggestions = this.history.slice(0, 5).map(h => ({ ...h, type: 'history' as const })); this.showDropDrop = this.dropSuggestions.length > 0; }
    else { this.showDropDrop = this.dropSuggestions.length > 0; }
  }

  selectDrop(s: LocationSuggestion): void {
    this.dropLocation = s.address; this.dropLat = s.lat; this.dropLng = s.lng;
    this.showDropDrop = false; this.dropSuggestions = [];
  }

  /* ── Map picker ── */
  openMap()  { this.showMapPicker = true; }
  closeMap() { this.showMapPicker = false; }

  onMapConfirm(r: MapPickerResult): void {
    this.showMapPicker  = false;
    this.pickupLocation = r.pickupAddress; this.pickupLat = r.pickupLat; this.pickupLng = r.pickupLng;
    this.dropLocation   = r.dropAddress;   this.dropLat  = r.dropLat;   this.dropLng  = r.dropLng;
    this.distanceKm     = r.distanceKm;
    this.recalcPrice();
    this.cdr.detectChanges();
  }

  /* ── Weight slider ── */
  get weightDisplay(): string { return this.weightKg < 1 ? `${this.weightKg * 1000}g` : `${this.weightKg} kg`; }
  get sliderPct(): number { return ((this.weightKg - 0.5) / (30 - 0.5)) * 100; }

  /* ── Price ── */
  recalcPrice(): void {
    if (!this.distanceKm) {
      const a = (this.pickupLocation + this.dropLocation).toLowerCase();
      let h = 0;
      for (let i = 0; i < a.length; i++) h = ((h << 5) - h + a.charCodeAt(i)) | 0;
      this.distanceKm = Math.round((2 + (Math.abs(h) % 280) / 10) * 10) / 10;
    }
    const x = this.deliveryType === 'express' ? 1.5 : 1;
    this.basePrice    = Math.round(40 * x);
    this.distanceCost = Math.round(this.distanceKm * 8 * Math.max(1, this.weightKg) * x);
    this.serviceFee   = Math.round(15 * x);
    this.totalPrice   = this.basePrice + this.distanceCost + this.serviceFee;
  }

  /* ── Find commuters ── */
  findCommuters(): void {
    if (!this.pickupLocation.trim() || !this.dropLocation.trim() || !this.preferredDate) return;
    this.showPickupDrop    = false;
    this.showDropDrop      = false;
    this.recalcPrice();
    this.searched          = false;
    this.isLoadingCommuters = true;
    this.cdr.detectChanges();

    this.deliveryService.getMatchingPortersCount(
      this.pickupLat, this.pickupLng, this.dropLat, this.dropLng
    ).pipe(catchError(() => of(0))).subscribe(count => {
      this.commuterCount     = count as number;
      this.searched          = true;
      this.isLoadingCommuters = false;
      this.cdr.detectChanges();
    });
  }

  get canSearch(): boolean {
    return this.pickupLocation.trim().length > 0
        && this.dropLocation.trim().length > 0
        && !!this.preferredDate;
  }

  /* ── Book ── */
  bookDelivery(): void {
    if (this.isSubmitting || !this.user.userId) return;
    this.isSubmitting = true;
    this.saveToHistory(this.pickupLocation, this.pickupLat, this.pickupLng);
    this.saveToHistory(this.dropLocation,   this.dropLat,   this.dropLng);

    const payload = {
      senderId: this.user.userId,
      pickupAddress: this.pickupLocation, pickupLat: this.pickupLat ?? null, pickupLng: this.pickupLng ?? null,
      dropAddress: this.dropLocation,     dropLat: this.dropLat ?? null,     dropLng: this.dropLng ?? null,
      receiverName: this.receiverName, receiverPhone: this.receiverPhone,
      packageType: this.packageType || 'other', packageSize: this.packageSize,
      weightKg: Number(this.weightKg), specialInstructions: this.specialInstructions,
      deliveryType: this.deliveryType.toUpperCase(),
      preferredDate: this.preferredDate || null,
      preferredTime: this.preferredTime || null,
      distanceKm: this.distanceKm, basePrice: this.basePrice,
      distanceCost: this.distanceCost, serviceFee: this.serviceFee,
      totalAmount: this.totalPrice, status: 'PENDING',
    };

    this.deliveryService.createDelivery(payload).subscribe({
      next: () => this.router.navigate(['/user-dashboard', this.user.userId]),
      error: err => {
        console.error(err);
        alert('Failed to schedule. Please try again.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  getEta(): string { return this.deliveryType === 'express' ? '30–90 mins' : '2–4 hours'; }
}
