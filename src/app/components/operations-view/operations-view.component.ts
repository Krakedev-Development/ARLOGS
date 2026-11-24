import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ServicePrefix, ServiceType, ShipmentJob } from '../../models/shipment.model';
import { MilestoneRulesEngine } from '../../domain/services/milestone-rules.engine';
import { JobDetailModalComponent } from '../job-detail-modal/job-detail-modal.component';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import { ModalShellComponent } from '../../presentation/ui/molecules/modal-shell/modal-shell.component';

@Component({
  selector: 'app-operations-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobDetailModalComponent,
    StatusPillComponent,
    PaginationBarComponent,
    ModalShellComponent,
  ],
  templateUrl: './operations-view.component.html',
  styleUrl: './operations-view.component.css',
})
export class OperationsViewComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly jobs = this.shipmentService.authorizedJobs;
  readonly clients = this.shipmentService.clients;

  searchQuery = signal<string>('');
  selectedModality = signal<string>('ALL');
  selectedStatus = signal<string>('ALL');
  selectedClient = signal<string>('ALL');
  selectedCustoms = signal<string>('ALL');

  selectedJob = signal<ShipmentJob | null>(null);
  showCreateModal = false;

  opsPage = signal(1);
  opsPageSize = signal(8);

  newJobForm = this.emptyNewJobForm();

  readonly filteredJobs = computed(() => {
    let list = this.jobs();
    const q = this.searchQuery().trim().toLowerCase();
    const mod = this.selectedModality();
    const stat = this.selectedStatus();
    const client = this.selectedClient();
    const customs = this.selectedCustoms();

    if (mod !== 'ALL') {
      list = list.filter((j) => j.servicio === mod);
    }
    if (stat !== 'ALL') {
      list = list.filter((j) => j.estado === stat);
    }
    if (client !== 'ALL') {
      list = list.filter((j) => j.clienteId === client);
    }
    if (customs !== 'ALL') {
      list = list.filter((j) => j.aduanaPorArlogs === customs);
    }

    if (q) {
      list = list.filter(
        (j) =>
          j.refArlogs.toLowerCase().includes(q) ||
          j.qrCode.toLowerCase().includes(q) ||
          j.cliente.toLowerCase().includes(q) ||
          j.shipper.toLowerCase().includes(q) ||
          j.guiaMaster.toLowerCase().includes(q) ||
          j.hawbHbl.toLowerCase().includes(q) ||
          j.contenedor.toLowerCase().includes(q) ||
          j.ordenesCompra.some((oc) => oc.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  readonly totalOpsPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredJobs().length / this.opsPageSize())),
  );

  readonly paginatedJobs = computed(() => {
    const page = Math.min(this.opsPage(), this.totalOpsPages());
    const start = (page - 1) * this.opsPageSize();
    return this.filteredJobs().slice(start, start + this.opsPageSize());
  });

  private emptyNewJobForm() {
    const firstClient = this.clients()[0];
    return {
      clienteId: firstClient?.id ?? '',
      cliente: firstClient?.nombre ?? '',
      servicio: 'AEREO' as ServiceType,
      serviceCode: 'A' as ServicePrefix,
      aduanaPorArlogs: 'SI' as 'SI' | 'NO' | 'N/A',
      shipper: '',
      paisOrigen: '',
      puertoEmbarque: '',
      incoterm: 'FOB',
      ordenesCompraStr: '',
      guiaMaster: '',
      pesoOrigen: 0,
    };
  }

  countByStatus(status: string): number {
    return this.jobs().filter((j) => j.estado === status).length;
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedModality.set('ALL');
    this.selectedStatus.set('ALL');
    this.selectedClient.set('ALL');
    this.selectedCustoms.set('ALL');
    this.opsPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todos los embarques.');
  }

  openNewShipmentModal(): void {
    this.newJobForm = this.emptyNewJobForm();
    this.showCreateModal = true;
  }

  onNewClientChange(clienteId: string): void {
    this.newJobForm.cliente = this.shipmentService.getClientName(clienteId);
  }

  onNewServiceChange(serv: ServiceType): void {
    this.newJobForm.serviceCode = MilestoneRulesEngine.SERVICE_PREFIX_MAP[serv];
    if (serv === 'INLAND') {
      this.newJobForm.aduanaPorArlogs = 'N/A';
    }
  }

  submitNewShipment(): void {
    if (
      !this.newJobForm.shipper.trim() ||
      !this.newJobForm.paisOrigen.trim() ||
      !this.newJobForm.puertoEmbarque.trim()
    ) {
      this.toastService.error(
        'Incorrecto',
        'Complete los campos obligatorios de shipper, país y puerto.',
      );
      return;
    }
    const ocs = this.newJobForm.ordenesCompraStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ocs.length === 0) {
      this.toastService.error('Incorrecto', 'Debe ingresar al menos una orden de compra.');
      return;
    }

    try {
      const created = this.shipmentService.createDirectShipment({
        clienteId: this.newJobForm.clienteId,
        cliente: this.newJobForm.cliente,
        servicio: this.newJobForm.servicio,
        serviceCode: this.newJobForm.serviceCode,
        aduanaPorArlogs: this.newJobForm.aduanaPorArlogs,
        shipper: this.newJobForm.shipper,
        paisOrigen: this.newJobForm.paisOrigen,
        puertoEmbarque: this.newJobForm.puertoEmbarque,
        incoterm: this.newJobForm.incoterm,
        ordenesCompra: ocs,
        guiaMaster: this.newJobForm.guiaMaster,
        pesoOrigen: this.newJobForm.pesoOrigen,
      });
      this.showCreateModal = false;
      this.toastService.success(
        'Correcto — Creado',
        `Embarque ${created.refArlogs} creado para ${created.cliente}.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el embarque.';
      this.toastService.error('Incorrecto', message);
    }
  }

  openDetail(job: ShipmentJob): void {
    this.selectedJob.set(job);
  }

  closeDetail(): void {
    this.selectedJob.set(null);
  }

  onJobSaved(event: { refArlogs: string; changes: Partial<ShipmentJob> }): void {
    try {
      const updated = this.shipmentService.updateJobMilestones(event.refArlogs, event.changes);
      this.selectedJob.set(null);
      this.toastService.success(
        'Actualizado — Hitos guardados',
        `Se recalcularon los tiempos de ${updated.refArlogs} (${updated.estado}).`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios.';
      this.toastService.error('Incorrecto', message);
    }
  }

  exportExcel(): void {
    const list = this.filteredJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success(
      'Correcto — Exportado',
      `Se descargó el reporte con ${list.length} embarques.`,
    );
  }
}
