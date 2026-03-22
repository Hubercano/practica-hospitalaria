import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type Notification = { type: 'success' | 'error' | 'info'; message: string; id?: string };

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private bus = new Subject<Notification>();
  public notifications$ = this.bus.asObservable();

  success(message: string) {
    this.bus.next({ type: 'success', message });
  }

  error(message: string) {
    this.bus.next({ type: 'error', message });
  }

  info(message: string) {
    this.bus.next({ type: 'info', message });
  }
}
