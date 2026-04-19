import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Singleton service — survives Angular route changes.
 * Holds the porter's online/offline state in memory + localStorage.
 */
@Injectable({ providedIn: 'root' })
export class PorterStatusService {

  private _isOnline = false;
  private _userId: number | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /** Call once after the profile is loaded to seed the initial value. */
  init(userId: number): void {
    this._userId = userId;
    this._isOnline = this.read(userId);
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /** Set new status and persist immediately. */
  set(value: boolean): void {
    this._isOnline = value;
    if (this._userId !== null) this.write(this._userId, value);
  }

  private key(userId: number): string {
    return `carrygo_porter_online_${userId}`;
  }

  private read(userId: number): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const v = localStorage.getItem(this.key(userId));
      return v === 'true';
    } catch { return false; }
  }

  private write(userId: number, value: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(this.key(userId), String(value)); } catch {}
  }
}
