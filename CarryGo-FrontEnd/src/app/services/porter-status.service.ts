import { Injectable } from '@angular/core';

/**
 * Singleton service — survives Angular route changes.
 * Holds the porter's online/offline state in memory only.
 * Starts offline on every fresh page load; only changes on explicit toggle.
 */
@Injectable({ providedIn: 'root' })
export class PorterStatusService {

  private _isOnline = false;

  /** Call once after the profile is loaded. No-op — exists so components can
   *  signal "profile is ready" without needing extra logic.
   *  The in-memory _isOnline persists across route changes and resets on page reload. */
  init(_userId: number): void { }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /** Set new status (called only from an explicit toggle click). */
  set(value: boolean): void {
    this._isOnline = value;
  }
}
