import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user-service';

export interface KycFormData {
  // Step 1 – Personal
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  // Step 2 – Identity
  idType: string;
  idNumber: string;
  idFrontFile: File | null;
  idBackFile:  File | null;
  idFrontPreview: string;
  idBackPreview:  string;
  // Step 3 – Address
  houseNo: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  // Step 4 – Vehicle
  vehicleType: string;
  vehicleModel: string;
  vehicleRegNo: string;
  licenceNumber: string;
  licenceExpiry: string;
  // Step 5 – Bank
  accountHolder: string;
  accountNumber: string;
  confirmAccount: string;
  ifscCode: string;
  bankName: string;
  // Step 6 – Legal
  agreedTerms: boolean;
  agreedAccuracy: boolean;
}

interface StepConfig {
  label: string;
  icon: string;
}

@Component({
  selector: 'porter-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './porter-kyc.html',
  styleUrls: ['./porter-kyc.css']
})
export class PorterKycComponent implements OnInit {

  currentStep = 0;
  isSubmitting = false;
  submitted = false;
  showAccountNumber = false;
  showConfirmAccount = false;
  termsScrolled = false;
  errors: Record<string, string> = {};

  porterProfile: any = null;
  userInitials = '';
  isOnline = false;
  isToggling = false;
  statusToast = '';
  earningsToday = 0;
  showProfileDropdown = false;

  steps: StepConfig[] = [
    { label: 'Personal',  icon: 'person' },
    { label: 'Identity',  icon: 'badge' },
    { label: 'Address',   icon: 'location' },
    { label: 'Vehicle',   icon: 'vehicle' },
    { label: 'Bank',      icon: 'bank' },
    { label: 'Legal',     icon: 'legal' },
    { label: 'Review',    icon: 'check' },
  ];

  vehicleOptions = [
    { value: '2-wheeler',  label: '2-Wheeler',  emoji: '🛵' },
    { value: '3-wheeler',  label: '3-Wheeler',  emoji: '🛺' },
    { value: '4-wheeler',  label: '4-Wheeler',  emoji: '🚗' },
    { value: 'bicycle',    label: 'Bicycle',    emoji: '🚲' },
  ];

  stateOptions = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
    'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
    'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
    'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
    'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir'
  ];

  form: KycFormData = {
    fullName: '', dob: '', gender: '', phone: '', email: '',
    idType: 'Aadhaar card', idNumber: '',
    idFrontFile: null, idBackFile: null, idFrontPreview: '', idBackPreview: '',
    houseNo: '', street: '', city: '', state: 'Telangana', pinCode: '',
    vehicleType: '', vehicleModel: '', vehicleRegNo: '', licenceNumber: '', licenceExpiry: '',
    accountHolder: '', accountNumber: '', confirmAccount: '', ifscCode: '', bankName: '',
    agreedTerms: false, agreedAccuracy: false
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
    this.userService.getPorterProfileByEmail(email).subscribe({
      next: (p: any) => {
        this.porterProfile = p;
        this.isOnline = p.isOnline ?? false;
        this.generateInitials(p.name);
        this.form.fullName = p.name  ?? '';
        this.form.phone    = p.phone ?? '';
        this.form.email    = p.email ?? '';
        this.userService.getWalletByUserId(p.userId).subscribe({
          next: (w: any) => this.earningsToday = w.balance ?? 0
        });
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  get progress() { return Math.round(((this.currentStep + 1) / this.steps.length) * 100); }

  next(): void {
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      window.scrollTo(0, 0);
    }
  }

  back(): void {
    if (this.currentStep > 0) { this.currentStep--; }
  }

  goToStep(i: number): void {
    if (i < this.currentStep) this.currentStep = i;
  }

  // ── Validation ────────────────────────────────────────────────────────────
  validateStep(step: number): boolean {
    this.errors = {};
    switch (step) {
      case 0:
        if (!this.form.fullName.trim())    this.errors['fullName'] = 'Full name is required';
        if (!this.form.dob)                this.errors['dob']      = 'Date of birth is required';
        else if (!this.isAdult(this.form.dob)) this.errors['dob'] = 'You must be at least 18 years old';
        if (!this.form.gender)             this.errors['gender']   = 'Please select a gender';
        if (!this.form.phone.trim() || !/^\d{10}$/.test(this.form.phone.trim()))
                                           this.errors['phone']    = 'Enter a valid 10-digit mobile number';
        if (!this.form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email))
                                           this.errors['email']    = 'Enter a valid email address';
        break;
      case 1:
        if (!this.form.idNumber.trim())    this.errors['idNumber'] = 'ID number is required';
        if (!this.form.idFrontPreview)     this.errors['idFront']  = 'Please upload the front side of your ID';
        break;
      case 2:
        if (!this.form.houseNo.trim())     this.errors['houseNo']  = 'House/Flat number is required';
        if (!this.form.street.trim())      this.errors['street']   = 'Street is required';
        if (!this.form.city.trim())        this.errors['city']     = 'City is required';
        if (!this.form.pinCode.trim() || !/^\d{6}$/.test(this.form.pinCode))
                                           this.errors['pinCode']  = 'Enter a valid 6-digit PIN code';
        break;
      case 3:
        if (!this.form.vehicleType)        this.errors['vehicleType']  = 'Select a vehicle type';
        if (!this.form.vehicleModel.trim()) this.errors['vehicleModel'] = 'Vehicle model is required';
        if (!this.form.vehicleRegNo.trim()) this.errors['vehicleRegNo'] = 'Registration number is required';
        if (!this.form.licenceNumber.trim()) this.errors['licenceNumber'] = 'Licence number is required';
        if (!this.form.licenceExpiry)      this.errors['licenceExpiry'] = 'Licence expiry date is required';
        break;
      case 4:
        if (!this.form.accountHolder.trim()) this.errors['accountHolder'] = 'Account holder name is required';
        if (!this.form.accountNumber.trim()) this.errors['accountNumber'] = 'Account number is required';
        if (this.form.accountNumber !== this.form.confirmAccount)
                                            this.errors['confirmAccount'] = 'Account numbers do not match';
        if (!this.form.ifscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(this.form.ifscCode.toUpperCase()))
                                            this.errors['ifscCode'] = 'Enter a valid IFSC code (e.g. SBIN0001234)';
        if (!this.form.bankName.trim())     this.errors['bankName'] = 'Bank name is required';
        break;
      case 5:
        if (!this.form.agreedTerms)        this.errors['terms']    = 'You must agree to the Terms & Conditions';
        if (!this.form.agreedAccuracy)     this.errors['accuracy'] = 'You must confirm accuracy of information';
        break;
    }
    return Object.keys(this.errors).length === 0;
  }

  isAdult(dob: string): boolean {
    const today = new Date();
    const birth = new Date(dob);
    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    return age > 18 || (age === 18 && m >= 0);
  }

  hasError(field: string): boolean { return !!this.errors[field]; }

  // ── File upload ───────────────────────────────────────────────────────────
  onFileDrop(event: DragEvent, side: 'front' | 'back'): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file, side);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  onFileSelect(event: Event, side: 'front' | 'back'): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.processFile(input.files[0], side);
  }

  processFile(file: File, side: 'front' | 'back'): void {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (side === 'front') { this.form.idFrontFile = file; this.form.idFrontPreview = result; }
      else                  { this.form.idBackFile  = file; this.form.idBackPreview  = result; }
    };
    reader.readAsDataURL(file);
  }

  removeFile(side: 'front' | 'back'): void {
    if (side === 'front') { this.form.idFrontFile = null; this.form.idFrontPreview = ''; }
    else                  { this.form.idBackFile  = null; this.form.idBackPreview  = ''; }
  }

  isPdf(preview: string): boolean { return preview.startsWith('data:application/pdf'); }

  // ── Submit ────────────────────────────────────────────────────────────────
  submitKyc(): void {
    if (!this.validateStep(5) || !this.porterProfile) return;
    this.isSubmitting = true;

    const payload = {
      name:          this.form.fullName,
      phone:         this.form.phone,
      vehicleType:   this.form.vehicleType,
      vehicleModel:  this.form.vehicleModel,
      vehicleNumber: this.form.vehicleRegNo,
      licenceNumber: this.form.licenceNumber,
      licenceExpiry: this.form.licenceExpiry
    };

    this.http.put(`${this.apiBase}/users/${this.porterProfile.userId}`, payload).subscribe({
      next: (updatedUser: any) => {
        // Merge updated fields into sessionStorage so profile shows KYC as verified
        try {
          const stored = sessionStorage.getItem('currentUser');
          if (stored) {
            const merged = { ...JSON.parse(stored), ...updatedUser };
            sessionStorage.setItem('currentUser', JSON.stringify(merged));
          }
        } catch {}
        this.isSubmitting = false;
        this.currentStep = 6;
        this.submitted = true;
      },
      error: () => { this.isSubmitting = false; this.currentStep = 6; this.submitted = true; }
    });
  }

  onTermsScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.termsScrolled = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
  }

  // ── Header helpers ────────────────────────────────────────────────────────
  toggleStatus(): void {
    if (!this.porterProfile || this.isToggling) return;
    this.isToggling = true;
    this.isOnline = !this.isOnline;
    this.statusToast = this.isOnline ? "You're now Online" : "You went Offline";
    setTimeout(() => { this.isToggling = false; }, 600);
    setTimeout(() => { this.statusToast = ''; }, 2800);
    this.userService.updatePorterStatus(this.porterProfile.userId, this.isOnline).subscribe({
      error: () => { this.isOnline = !this.isOnline; }
    });
  }

  generateInitials(name: string): void {
    const parts = name.trim().split(' ');
    this.userInitials = parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
  }

  toggleProfileDropdown(): void { this.showProfileDropdown = !this.showProfileDropdown; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = document.querySelector('.profile-section');
    if (el && !el.contains(event.target as Node)) this.showProfileDropdown = false;
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
