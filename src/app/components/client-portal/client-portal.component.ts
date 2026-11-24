import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentJob } from '../../models/shipment.model';
import { LogisticsAnalyticsEngine } from '../../domain/services/logistics-analytics.engine';
import { JobDetailModalComponent } from '../job-detail-modal/job-detail-modal.component';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import {
  KpiStatCardItem,
  KpiStatRibbonComponent,
} from '../../presentation/ui/organisms/kpi-stat-ribbon/kpi-stat-ribbon.component';

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobDetailModalComponent,
    StatusPillComponent,
    PaginationBarComponent,
    KpiStatRibbonComponent,
  ],
  templateUrl: './client-portal.component.html',
  styleUrl: './client-portal.component.css',
})
export class ClientPortalComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly currentUser = this.shipmentService.currentUser;
  readonly clientJobs = this.shipmentService.authorizedJobs;

  filterMonth = signal('ALL');
  filterShipper = signal('ALL');
  filterPO = signal('');
  filterModality = signal('ALL');
  filterIncoterm = signal('ALL');

  selectedJob = signal<ShipmentJob | null>(null);

  clientPage = signal(1);
  clientPageSize = signal(6);

  readonly availableShippers = computed(() => {
    const set = new Set<string>();
    this.clientJobs().forEach((j) => set.add(j.shipper));
    return Array.from(set).sort();
  });

  readonly filteredClientJobs = computed(() => {
    let list = this.clientJobs();
    const month = this.filterMonth();
    const shipper = this.filterShipper();
    const modality = this.filterModality();
    const incoterm = this.filterIncoterm();
    const po = this.filterPO().toLowerCase().trim();

    if (month !== 'ALL') {
      list = list.filter((j) => j.h1_asignacion && j.h1_asignacion.split('-')[1] === month);
    }
    if (shipper !== 'ALL') {
      list = list.filter((j) => j.shipper === shipper);
    }
    if (modality !== 'ALL') {
      list = list.filter((j) => j.servicio === modality);
    }
    if (incoterm !== 'ALL') {
      list = list.filter((j) => j.incoterm === incoterm);
    }
    if (po) {
      list = list.filter(
        (j) =>
          j.refArlogs.toLowerCase().includes(po) ||
          j.ordenesCompra.some((o) => o.toLowerCase().includes(po)),
      );
    }
    return list;
  });

  readonly totalClientPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClientJobs().length / this.clientPageSize())),
  );

  readonly paginatedClientJobs = computed(() => {
    const page = Math.min(this.clientPage(), this.totalClientPages());
    const start = (page - 1) * this.clientPageSize();
    return this.filteredClientJobs().slice(start, start + this.clientPageSize());
  });

  readonly openJobsCount = computed(
    () =>
      this.filteredClientJobs().filter((j) => j.estado === 'ABIERTO' || j.estado === 'REVISAR')
        .length,
  );

  readonly closedJobsCount = computed(
    () => this.filteredClientJobs().filter((j) => j.estado === 'CERRADO').length,
  );

  readonly avgClientCycle = computed(() =>
    LogisticsAnalyticsEngine.averageOfMetric(
      this.filteredClientJobs().map((j) => j.diasCicloTotal),
    ),
  );

  readonly kpiItems = computed<readonly KpiStatCardItem[]>(() => [
    {
      label: 'Mis Embarques',
      value: this.filteredClientJobs().length,
      icon: 'bi-box-seam',
      iconBgClass: 'bg-slate-100 text-dark',
      valueColorClass: 'text-dark',
    },
    {
      label: 'En Tránsito',
      value: this.openJobsCount(),
      icon: 'bi-arrow-repeat',
      iconBgClass: 'bg-blue-50 text-primary',
      valueColorClass: 'text-primary',
    },
    {
      label: 'Completados',
      value: this.closedJobsCount(),
      icon: 'bi-check-circle',
      iconBgClass: 'bg-emerald-50 text-success',
      valueColorClass: 'text-success',
    },
    {
      label: 'Ciclo Promedio',
      value: `${this.avgClientCycle()} d`,
      icon: 'bi-clock-history',
      iconBgClass: 'bg-amber-50 text-warning',
      valueColorClass: 'text-dark',
    },
  ]);

  readonly monthlyDistribution = computed(() =>
    LogisticsAnalyticsEngine.computeMonthlyDistribution(this.filteredClientJobs()),
  );

  readonly purchaseOrderSummary = computed(() =>
    LogisticsAnalyticsEngine.computePurchaseOrderSummary(this.filteredClientJobs()),
  );

  readonly customsSummary = computed(() =>
    LogisticsAnalyticsEngine.computeCustomsAnalytics(this.filteredClientJobs()),
  );

  readonly dispatchAttribution = computed(() => {
    const list = this.filteredClientJobs();
    return {
      respShipper: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasRespuestaShipper),
      ),
      alistamiento: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasAlistamiento)),
      transito: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasTransito)),
      arriboDecl: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasArriboDeclaracion),
      ),
      declPago: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasDeclaracionPago)),
      pagoInforme: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasPagoInforme)),
    };
  });

  readonly shipperInsights = computed(() => {
    const list = this.filteredClientJobs();
    const total = list.length || 1;
    const map = new Map<string, number>();
    list.forEach((j) => {
      if (j.shipper && j.shipper !== 'N/A') {
        map.set(j.shipper, (map.get(j.shipper) || 0) + 1);
      }
    });
    const ranking = Array.from(map.entries())
      .map(([shipper, count]) => ({ shipper, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
    const top3Count = ranking.slice(0, 3).reduce((acc, r) => acc + r.count, 0);
    return {
      ranking,
      top3Pct: list.length ? Math.round((top3Count / list.length) * 100) : 0,
    };
  });

  resetFilters(): void {
    this.filterMonth.set('ALL');
    this.filterShipper.set('ALL');
    this.filterPO.set('');
    this.filterModality.set('ALL');
    this.filterIncoterm.set('ALL');
    this.clientPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todos sus embarques.');
  }

  viewJobDetail(job: ShipmentJob): void {
    this.selectedJob.set(job);
  }

  exportExcel(): void {
    const list = this.filteredClientJobs();
    this.shipmentService.exportToExcel(list);
    this.toastService.success(
      'Correcto — Exportado',
      `Se descargó el Excel con ${list.length} embarques.`,
    );
  }
}
