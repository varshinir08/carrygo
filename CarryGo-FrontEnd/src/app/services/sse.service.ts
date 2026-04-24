import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { Client, StompSubscription } from '@stomp/stompjs';

export interface SseEvent {
  event: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class SseService {
  private stompClient: Client | null = null;
  private subject = new Subject<SseEvent>();

  /** Active STOMP subscriptions for chat rooms */
  private chatSubs = new Map<number, StompSubscription>();

  /**
   * Chat rooms requested before the STOMP connection finished opening.
   * Flushed inside onConnect so no subscription is ever silently dropped.
   */
  private pendingChatSubs = new Set<number>();

  private readonly wsUrl = 'ws://localhost:8081/ws';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Connect to the WebSocket broker.
   * @param userId   The logged-in user's ID.
   * @param isPorter Also subscribe to the porter broadcast topic for ride requests.
   */
  connect(userId: number, isPorter = false): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) return this.subject.asObservable();
    this.disconnect();

    this.stompClient = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,

      onConnect: () => {
        // Personal channel — statusUpdate, broadcastUpdate, chatMessage, etc.
        this.stompClient!.subscribe(`/topic/user/${userId}`, msg => this.emit(msg.body));

        // Porter broadcast — all new ride requests
        if (isPorter) {
          this.stompClient!.subscribe('/topic/new-orders', msg => this.emit(msg.body));
        }

        // Flush any chat rooms that were requested before we connected
        this.pendingChatSubs.forEach(id => this._doSubscribeToChat(id));
        this.pendingChatSubs.clear();
      },
    });

    this.stompClient.activate();
    return this.subject.asObservable();
  }

  /**
   * Subscribe to the chat room for a delivery.
   * Safe to call before the STOMP connection is open — will queue and apply on connect.
   */
  subscribeToChat(deliveryId: number): void {
    if (this.chatSubs.has(deliveryId)) return; // already subscribed

    if (!this.stompClient?.connected) {
      // Not connected yet — queue it; onConnect will flush the set
      this.pendingChatSubs.add(deliveryId);
      return;
    }

    this._doSubscribeToChat(deliveryId);
  }

  /** Internal: actually create the STOMP subscription (only call when connected). */
  private _doSubscribeToChat(deliveryId: number): void {
    if (this.chatSubs.has(deliveryId) || !this.stompClient?.connected) return;
    const sub = this.stompClient.subscribe(
      `/topic/chat/${deliveryId}`,
      msg => this.emit(msg.body)
    );
    this.chatSubs.set(deliveryId, sub);
  }

  /** Unsubscribe from a delivery's chat room. Call when chat window closes. */
  unsubscribeFromChat(deliveryId: number): void {
    this.pendingChatSubs.delete(deliveryId);
    const sub = this.chatSubs.get(deliveryId);
    if (sub) { sub.unsubscribe(); this.chatSubs.delete(deliveryId); }
  }

  disconnect(): void {
    this.chatSubs.forEach(s => s.unsubscribe());
    this.chatSubs.clear();
    this.pendingChatSubs.clear();
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  private emit(body: string): void {
    try {
      const parsed = JSON.parse(body) as SseEvent;
      this.subject.next(parsed);
    } catch {}
  }
}
