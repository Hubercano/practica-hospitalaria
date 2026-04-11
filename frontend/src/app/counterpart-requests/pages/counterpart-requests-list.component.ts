import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { ApproveCounterpartModalComponent } from '../components/approve-counterpart-modal.component';
import { CounterpartRequestItem, CounterpartRequestsService } from '../counterpart-requests.service';

@Component({
  selector: 'app-counterpart-requests-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, CardComponent, ApproveCounterpartModalComponent],
  templateUrl: './counterpart-requests-list.component.html',
})
export class CounterpartRequestsListComponent implements OnInit {
  private readonly counterpartRequestsService = inject(CounterpartRequestsService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly isHospital = computed(() => this.currentUser()?.role === 'HOSPITAL');
  readonly isInstitution = computed(() => this.currentUser()?.role === 'INSTITUCION');

  readonly loading = signal(true);
  readonly items = signal<CounterpartRequestItem[]>([]);
  readonly showApproveModal = signal(false);
  readonly approving = signal(false);
  readonly selectedItem = signal<CounterpartRequestItem | null>(null);

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading.set(true);
    this.counterpartRequestsService.getRequests(true).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
        this.counterpartRequestsService.clearUnreadCount();
      },
      error: (error) => {
        this.loading.set(false);
        this.notificationService.error(error?.error?.message || 'No fue posible cargar las contraprestaciones.');
      },
    });
  }

  openApproveModal(item: CounterpartRequestItem) {
    this.selectedItem.set(item);
    this.showApproveModal.set(true);
  }

  closeApproveModal() {
    this.selectedItem.set(null);
    this.showApproveModal.set(false);
    this.approving.set(false);
  }

  approveRequest(payload: { valueWithoutDiscount: number; discountPercentage: number; valueWithDiscount: number }) {
    const item = this.selectedItem();
    if (!item) {
      return;
    }

    this.approving.set(true);
    this.counterpartRequestsService.approveRequest(item.id, payload).subscribe({
      next: () => {
        this.notificationService.success('Contraprestación aprobada correctamente.');
        this.closeApproveModal();
        this.loadItems();
      },
      error: (error) => {
        this.approving.set(false);
        this.notificationService.error(error?.error?.message || 'No fue posible aprobar la contraprestación.');
      },
    });
  }

  rejectRequest(item: CounterpartRequestItem) {
    if (!confirm(`¿Desea rechazar la contraprestación "${item.name}"?`)) {
      return;
    }

    this.counterpartRequestsService.rejectRequest(item.id).subscribe({
      next: () => {
        this.notificationService.success('Contraprestación rechazada correctamente.');
        this.loadItems();
      },
      error: (error) => {
        this.notificationService.error(error?.error?.message || 'No fue posible rechazar la contraprestación.');
      },
    });
  }

  downloadFile(item: CounterpartRequestItem) {
    this.counterpartRequestsService.downloadFile(item.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.notificationService.error('No fue posible descargar el archivo.');
          return;
        }

        const contentDisposition = response.headers.get('content-disposition') || '';
        const match = contentDisposition.match(/filename=([^;]+)/i);
        const fileName = match?.[1]?.replace(/"/g, '') || item.originalFileName || 'contraprestacion.xlsx';
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.notificationService.error(error?.error?.message || 'No fue posible descargar el archivo.');
      },
    });
  }

  statusLabel(status: string) {
    if (status === 'APPROVED') {
      return 'Aprobada';
    }

    if (status === 'REJECTED') {
      return 'Rechazada';
    }

    return 'Pendiente';
  }

  statusClasses(status: string) {
    if (status === 'APPROVED') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'REJECTED') {
      return 'bg-rose-100 text-rose-700';
    }

    return 'bg-amber-100 text-amber-700';
  }
}