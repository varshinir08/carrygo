import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Delivery } from '../services/delivery/delivery';
import { Wallet } from '../services/wallet/wallet';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit {
  user: any = {};
  deliveries: any[] = [];
  wallet: any = { balance: 0 };
  isSubmitting = false;

  // Expanded to match your Java 'Deliveries' Entity requirements
  delivery = {
    pickupAddress: '',
    pickupPhone: '',
    dropAddress: '',
    receiverName: '',
    receiverPhone: '',
    packageType: '',
    weightKg: 0,
    status: 'PENDING',
    sender: { userId: null as number | null }
  };

  constructor(
    private authService: AuthService,
    private deliveryService: Delivery,
    private walletService: Wallet,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const loggedInUser = this.authService.getCurrentUser();
    if (loggedInUser) {
      this.user = loggedInUser;
      this.delivery.sender.userId = this.user.userId;
      this.loadDeliveries();
      this.loadWallet();
    }
  }

  loadWallet() {
    if (!this.user.userId) return;
    this.walletService.getWalletByUserId(this.user.userId).subscribe({
      next: (res: any) => {
        this.wallet = res;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Wallet Load Error:", err)
    });
  }

  loadDeliveries() {
    if (!this.user.userId) return;
    this.deliveryService.getUserDeliveries(this.user.userId).subscribe({
      next: (res: any[]) => {
        // Reverse to show newest first
        this.deliveries = [...res].reverse();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error("Load Deliveries Error:", err)
    });
  }

  createDelivery() {
    if (this.isSubmitting || !this.user.userId) return;
    this.isSubmitting = true;

    // Ensure numeric values are sent as Floats/Integers, not strings
    const payload = {
      ...this.delivery,
      weightKg: Number(this.delivery.weightKg),
      createdAt: new Date().toISOString(),
      distanceKm: 5.0, // Temporary dummy data to satisfy backend
      totalAmount: 150.0
    };

    this.deliveryService.createDelivery(payload).subscribe({
      next: (res) => {
        console.log("Created successfully:", res);
        this.loadDeliveries();
        this.loadWallet();
        this.resetForm();
      },
      error: (err) => {
        console.error("Post Error:", err);
        alert("Failed to create delivery. Check console for details.");
      },
      complete: () => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.delivery = {
      pickupAddress: '',
      pickupPhone: '',
      dropAddress: '',
      receiverName: '',
      receiverPhone: '',
      packageType: '',
      weightKg: 0,
      status: 'PENDING',
      sender: { userId: this.user.userId }
    };
  }
}
