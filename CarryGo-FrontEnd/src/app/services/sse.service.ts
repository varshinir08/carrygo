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
  private chatSubs = new Map<number, StompSubscription>();

  private readonly wsUrl = 'ws://localhost:8081/ws';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Connect to the WebSocket broker.
   * @param userId    The logged-in user's ID.
   * @param isPorter  Also subscribe to the porter broadcast topic for ride requests.
   */
  connect(userId: number, isPorter = false): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) return this.subject.asObservable();
    this.disconnect();

    this.stompClient = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 5000,

      onConnect: () => {
        // Personal channel — statusUpdate, broadcastUpdate, etc.
        this.stompClient!.subscribe(`/topic/user/${userId}`, msg => this.emit(msg.body));

        // Porter broadcast — all new ride requests
        if (isPorter) {
          this.stompClient!.subscribe('/topic/new-orders', msg => this.emit(msg.body));
        }
      },
    });

    this.stompClient.activate();
    return this.subject.asObservable();
  }

  /** Subscribe to the chat room for a delivery. Call when chat window opens. */
  subscribeToChat(deliveryId: number): void {
    if (!this.stompClient?.connected || this.chatSubs.has(deliveryId)) return;
    const sub = this.stompClient.subscribe(
      `/topic/chat/${deliveryId}`,
      msg => this.emit(msg.body)
    );
    this.chatSubs.set(deliveryId, sub);
  }

  /** Unsubscribe from a delivery's chat room. Call when chat window closes. */
  unsubscribeFromChat(deliveryId: number): void {
    const sub = this.chatSubs.get(deliveryId);
    if (sub) { sub.unsubscribe(); this.chatSubs.delete(deliveryId); }
  }

  disconnect(): void {
    this.chatSubs.forEach(s => s.unsubscribe());
    this.chatSubs.clear();
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
