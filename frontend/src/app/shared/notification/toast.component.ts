import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from './notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fixed right-6 top-6 z-50 space-y-3 w-96">
    <div *ngFor="let n of list" [ngClass]="{ 'bg-green-600 text-white': n.type==='success', 'bg-red-600 text-white': n.type==='error', 'bg-blue-600 text-white': n.type==='info' }" class="p-3 rounded shadow-md">
      <div class="text-sm">{{ n.message }}</div>
    </div>
  </div>
  `
})
export class ToastComponent implements OnDestroy {
  list: Notification[] = [];
  sub: Subscription;

  constructor(private ns: NotificationService) {
    this.sub = this.ns.notifications$.subscribe((n) => {
      const id = String(Date.now()) + Math.random();
      this.list.push({ ...n, id });
      setTimeout(() => this.remove(id), 5000);
    });
  }

  remove(id: string) {
    this.list = this.list.filter((x) => x.id !== id);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
