import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentJob } from '../../models/shipment.model';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import { ModalShellComponent } from '../../presentation/ui/molecules/modal-shell/modal-shell.component';
import {
  KpiStatCardItem,
  KpiStatRibbonComponent,
} from '../../presentation/ui/organisms/kpi-stat-ribbon/kpi-stat-ribbon.component';

@Component({
  selector: 'app-billing-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusPillComponent,
    PaginationBarComponent,
    ModalShellComponent,
    KpiStatRibbonComponent,
  ],
  templateUrl: './billing-view.component.html',
  styleUrl: './billing-view.component.css',
})
export class BillingViewComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly jobs = this.shipmentService.authorizedJobs;
  readonly clients = this.shipmentService.clients;

  searchQuery = signal<string>('');
  filterStatus = signal<string>('ALL');
  filterClient = signal<string>('ALL');

  editingJob = signal<ShipmentJob | null>(null);

  billingPage = signal(1);
  billingPageSize = signal(6);

  invoiceForm: {
    facturaNumero: string;
    valorFacturadoReal: number;
    costoReal: number;
    estadoCobro: 'FACTURADA' | 'COBRADA' | 'VENCIDA';
  } = {
    facturaNumero: '',
    valorFacturadoReal: 0,
    costoReal: 0,
    estadoCobro: 'FACTURADA',
  };

  readonly filteredJobs = computed(() => {
    let list = this.jobs();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const client = this.filterClient();

    if (client !== 'ALL') {
      list = list.filter((j) => j.clienteId === client);
    }
    if (status !== 'ALL') {
      if (status === 'PENDIENTE_FACTURAR') {
        list = list.filter((j) => !j.facturaNumero);
      } else {
        list = list.filter((j) => j.estadoCobro === status);
      }
    }
    if (q) {
      list = list.filter(
        (j) =>
          j.refArlogs.toLowerCase().includes(q) ||
          j.qrCode.toLowerCase().includes(q) ||
          j.cliente.toLowerCase().includes(q) ||
          Boolean(j.facturaNumero && j.facturaNumero.toLowerCase().includes(q)) ||
          j.ordenesCompra.some((oc) => oc.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  readonly totalBillingPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredJobs().length / this.billingPageSize())),
  );

  readonly paginatedJobs = computed(() => {
    const page = Math.min(this.billingPage(), this.totalBillingPages());
    const start = (page - 1) * this.billingPageSize();
    return this.filteredJobs().slice(start, start + this.billingPageSize());
  });

  readonly totals = computed(() => {
    const list = this.jobs();
    let cotizado = 0;
    let facturado = 0;
    let profitReal = 0;
    let profitCotizado = 0;
    let facturadosCount = 0;
    let pendientes = 0;
    let riesgoFlujo = 0;

    for (const j of list) {
      const vc = j.valorVentaCotizado ?? 0;
      const ce = j.costoEstimadoCotizado ?? 0;
      cotizado += vc;
      profitCotizado += vc - ce;

      if (j.valorFacturadoReal !== undefined) {
        facturado += j.valorFacturadoReal;
        profitReal += j.valorFacturadoReal - (j.costoReal ?? ce);
        facturadosCount++;
      } else {
        pendientes++;
      }
      if (this.isCashflowAlert(j)) riesgoFlujo++;
    }
    return {
      cotizado,
      facturado,
      profitReal,
      profitCotizado,
      facturadosCount,
      pendientes,
      riesgoFlujo,
    };
  });

  readonly kpiItems = computed<readonly KpiStatCardItem[]>(() => {
    const t = this.totals();
    return [
      {
        label: 'Total Cotizado',
        value: `$${t.cotizado.toLocaleString('en-US')}`,
        icon: 'bi-tag',
        iconBgClass: 'bg-slate-100 text-dark',
        valueColorClass: 'text-dark',
      },
      {
        label: 'Facturado Real',
        value: `$${t.facturado.toLocaleString('en-US')}`,
        icon: 'bi-receipt-cutoff',
        iconBgClass: 'bg-emerald-50 text-success',
        valueColorClass: 'text-success',
      },
      {
        label: 'Profit Real',
        value: `$${t.profitReal.toLocaleString('en-US')}`,
        icon: 'bi-graph-up-arrow',
        iconBgClass: 'bg-blue-50 text-primary',
        valueColorClass: t.profitReal >= 0 ? 'text-primary' : 'text-danger',
      },
      {
        label: 'Pendientes',
        value: t.pendientes,
        icon: 'bi-hourglass-split',
        iconBgClass: 'bg-amber-50 text-warning',
        valueColorClass: 'text-warning',
      },
    ];
  });

  getProfit(j: ShipmentJob): number {
    return (j.valorFacturadoReal ?? 0) - (j.costoReal ?? j.costoEstimadoCotizado ?? 0);
  }

  isCashflowAlert(j: ShipmentJob): boolean {
    const val = j.valorFacturadoReal ?? j.valorVentaCotizado ?? 0;
    return val >= 5000 && (j.plazoPagoDias ?? 15) >= 30 && j.estadoCobro !== 'COBRADA';
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterClient.set('ALL');
    this.billingPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todas las operaciones facturables.');
  }

  openInvoiceModal(job: ShipmentJob): void {
    this.editingJob.set(job);
    const nextNum = 500 + this.jobs().filter((j) => j.facturaNumero).length + 1;
    this.invoiceForm = {
      facturaNumero: job.facturaNumero || `FAC-001-${nextNum.toString().padStart(5, '0')}`,
      valorFacturadoReal: job.valorFacturadoReal ?? job.valorVentaCotizado ?? 0,
      costoReal: job.costoReal ?? job.costoEstimadoCotizado ?? 0,
      estadoCobro:
        job.estadoCobro === 'COBRADA'
          ? 'COBRADA'
          : job.estadoCobro === 'VENCIDA'
            ? 'VENCIDA'
            : 'FACTURADA',
    };
  }

  saveInvoice(): void {
    const job = this.editingJob();
    if (!job) return;
    if (!this.invoiceForm.facturaNumero.trim() || this.invoiceForm.valorFacturadoReal < 0) {
      this.toastService.error('Incorrecto', 'Ingrese un número de factura y monto válido.');
      return;
    }
    try {
      const updated = this.shipmentService.updateBilling(job.refArlogs, this.invoiceForm);
      this.editingJob.set(null);
      this.toastService.success(
        'Actualizado — Facturación',
        `${updated.facturaNumero} registrada para ${updated.refArlogs} ($${updated.valorFacturadoReal}).`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar factura.';
      this.toastService.error('Incorrecto', message);
    }
  }

  markCollected(job: ShipmentJob): void {
    try {
      const updated = this.shipmentService.updateBilling(job.refArlogs, {
        facturaNumero: job.facturaNumero || `FAC-${job.refArlogs}`,
        valorFacturadoReal: job.valorFacturadoReal ?? job.valorVentaCotizado ?? 0,
        costoReal: job.costoReal ?? job.costoEstimadoCotizado ?? 0,
        estadoCobro: 'COBRADA',
      });
      this.toastService.success(
        'Correcto — Cobrado',
        `Factura ${updated.facturaNumero} marcada como COBRADA.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar cobro.';
      this.toastService.error('Incorrecto', message);
    }
  }

  exportBillingExcel(): void {
    const list = this.filteredJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success(
      'Correcto — Exportado',
      `Conciliación financiera (${list.length} registros) descargada.`,
    );
  }
}
