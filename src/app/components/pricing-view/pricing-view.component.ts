import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { Quotation, ServiceType, ServicePrefix } from '../../models/shipment.model';
import { MilestoneRulesEngine } from '../../domain/services/milestone-rules.engine';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import { ModalShellComponent } from '../../presentation/ui/molecules/modal-shell/modal-shell.component';

@Component({
  selector: 'app-pricing-view',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationBarComponent, ModalShellComponent],
  templateUrl: './pricing-view.component.html',
  styleUrl: './pricing-view.component.css',
})
export class PricingViewComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly quotations = this.shipmentService.quotations;

  searchQuery = signal<string>('');
  filterStatus = signal<string>('ALL');
  filterModality = signal<string>('ALL');

  showQuoteModal = false;
  editingQuoteId: string | null = null;

  pricingPage = signal(1);
  pricingPageSize = signal(6);

  quoteForm = this.emptyForm();

  readonly pendingCount = computed(
    () => this.quotations().filter((q) => q.estado === 'PENDIENTE').length,
  );

  readonly filteredQuotations = computed(() => {
    let list = this.quotations();
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const modality = this.filterModality();

    if (status !== 'ALL') {
      list = list.filter((item) => item.estado === status);
    }
    if (modality !== 'ALL') {
      list = list.filter((item) => item.servicio === modality);
    }
    if (q) {
      list = list.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          item.cliente.toLowerCase().includes(q) ||
          item.shipper.toLowerCase().includes(q) ||
          item.paisOrigen.toLowerCase().includes(q) ||
          item.puertoEmbarque.toLowerCase().includes(q) ||
          item.ordenesCompra.some((oc) => oc.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  readonly totalPricingPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredQuotations().length / this.pricingPageSize())),
  );

  readonly paginatedQuotations = computed(() => {
    const page = Math.min(this.pricingPage(), this.totalPricingPages());
    const start = (page - 1) * this.pricingPageSize();
    return this.filteredQuotations().slice(start, start + this.pricingPageSize());
  });

  private emptyForm() {
    return {
      clienteId: 'CLI-001',
      cliente: 'Industrias Andinas S.A.',
      servicio: 'AEREO' as ServiceType,
      serviceCode: 'A' as ServicePrefix,
      shipper: '',
      paisOrigen: '',
      puertoEmbarque: '',
      incoterm: 'FOB',
      ordenesCompraStr: 'OC-1005',
      aduanaPorArlogs: 'SI' as 'SI' | 'NO' | 'N/A',
      valorVentaCotizado: 2400,
      costoEstimadoCotizado: 1850,
      plazoPagoDias: 15,
    };
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.filterModality.set('ALL');
    this.pricingPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando todas las cotizaciones.');
  }

  openCreateModal(): void {
    this.editingQuoteId = null;
    this.quoteForm = this.emptyForm();
    this.showQuoteModal = true;
  }

  openEditModal(q: Quotation): void {
    this.editingQuoteId = q.id;
    this.quoteForm = {
      clienteId: q.clienteId,
      cliente: q.cliente,
      servicio: q.servicio,
      serviceCode: q.serviceCode,
      shipper: q.shipper,
      paisOrigen: q.paisOrigen,
      puertoEmbarque: q.puertoEmbarque,
      incoterm: q.incoterm,
      ordenesCompraStr: q.ordenesCompra.join(', '),
      aduanaPorArlogs: q.aduanaPorArlogs,
      valorVentaCotizado: q.valorVentaCotizado ?? 2200,
      costoEstimadoCotizado: q.costoEstimadoCotizado ?? 1750,
      plazoPagoDias: q.plazoPagoDias ?? 15,
    };
    this.showQuoteModal = true;
  }

  onClientSelect(clienteId: string): void {
    this.quoteForm.cliente =
      clienteId === 'CLI-001' ? 'Industrias Andinas S.A.' : 'Comercial Pacífico Cía. Ltda.';
  }

  onServiceSelect(serv: ServiceType): void {
    this.quoteForm.serviceCode = MilestoneRulesEngine.SERVICE_PREFIX_MAP[serv];
    if (serv === 'INLAND') {
      this.quoteForm.aduanaPorArlogs = 'N/A';
    }
  }

  onSubmitQuote(): void {
    if (
      !this.quoteForm.shipper.trim() ||
      !this.quoteForm.paisOrigen.trim() ||
      !this.quoteForm.puertoEmbarque.trim()
    ) {
      this.toastService.error(
        'Incorrecto',
        'Complete todos los campos obligatorios de shipper, país y puerto.',
      );
      return;
    }

    const ocs = this.quoteForm.ordenesCompraStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ocs.length === 0) {
      this.toastService.error('Incorrecto', 'Debe ingresar al menos una orden de compra.');
      return;
    }

    try {
      if (this.editingQuoteId) {
        const updated = this.shipmentService.updateQuotation(this.editingQuoteId, {
          clienteId: this.quoteForm.clienteId,
          cliente: this.quoteForm.cliente,
          servicio: this.quoteForm.servicio,
          serviceCode: this.quoteForm.serviceCode,
          shipper: this.quoteForm.shipper.trim(),
          paisOrigen: this.quoteForm.paisOrigen.trim().toUpperCase(),
          puertoEmbarque: this.quoteForm.puertoEmbarque.trim().toUpperCase(),
          incoterm: this.quoteForm.incoterm,
          ordenesCompra: ocs,
          aduanaPorArlogs: this.quoteForm.aduanaPorArlogs,
          valorVentaCotizado: Number(this.quoteForm.valorVentaCotizado) || 0,
          costoEstimadoCotizado: Number(this.quoteForm.costoEstimadoCotizado) || 0,
          plazoPagoDias: Number(this.quoteForm.plazoPagoDias) || 0,
        });
        this.showQuoteModal = false;
        this.toastService.success('Correcto — Actualizado', `Cotización ${updated.id} modificada.`);
      } else {
        const created = this.shipmentService.createQuotation({
          clienteId: this.quoteForm.clienteId,
          cliente: this.quoteForm.cliente,
          fechaCotizacion: new Date().toISOString().slice(0, 10),
          servicio: this.quoteForm.servicio,
          serviceCode: this.quoteForm.serviceCode,
          shipper: this.quoteForm.shipper.trim(),
          paisOrigen: this.quoteForm.paisOrigen.trim().toUpperCase(),
          puertoEmbarque: this.quoteForm.puertoEmbarque.trim().toUpperCase(),
          incoterm: this.quoteForm.incoterm,
          ordenesCompra: ocs,
          aduanaPorArlogs: this.quoteForm.aduanaPorArlogs,
          valorVentaCotizado: Number(this.quoteForm.valorVentaCotizado) || 0,
          costoEstimadoCotizado: Number(this.quoteForm.costoEstimadoCotizado) || 0,
          plazoPagoDias: Number(this.quoteForm.plazoPagoDias) || 0,
        });
        this.showQuoteModal = false;
        this.toastService.success('Correcto — Creado', `Cotización ${created.id} registrada.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar la cotización.';
      this.toastService.error('Incorrecto', message);
    }
  }

  approveQuotation(q: Quotation): void {
    try {
      const job = this.shipmentService.approveQuotation(q.id);
      this.toastService.success(
        'Correcto — Aprobado',
        `Cotización ${q.id} aprobada. Código generado: ${job.refArlogs}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo aprobar la cotización.';
      this.toastService.error('Incorrecto', message);
    }
  }
}
