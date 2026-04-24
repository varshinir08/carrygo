import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Singleton service — survives Angular route changes.
 * Seeds online/offline state from DB exactly once per session (first page load).
 * Subsequent porter page loads read the in-memory value so toggles survive navigation.
 */
@Injectable({ providedIn: 'root' })
export class PorterStatusService {

  private _isOnline = false;
  private _userId: number | null = null;
  private _seeded = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Call on every porter page load after fetching the profile.
   * - First call for this user: seeds from dbValue (authoritative DB state).
   * - Subsequent calls (navigating between pages): keeps the current in-memory state.
   */
  init(userId: number, dbValue: boolean): void {
    if (this._seeded && this._userId === userId) {
      return;
    }
    this._userId = userId;
    this._isOnline = dbValue;
    this._seeded = true;
    this.write(userId, dbValue);
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /** Update status in memory and persist immediately. */
  set(value: boolean): void {
    this._isOnline = value;
    if (this._userId !== null) this.write(this._userId, value);
  }

  /** Call on logout so the next login re-seeds from DB. */
  reset(): void {
    this._seeded = false;
    this._userId = null;
    this._isOnline = false;
  }

  private key(userId: number): string {
    return `carrygo_porter_online_${userId}`;
  }

  private write(userId: number, value: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(this.key(userId), String(value)); } catch {}
  }
}
