import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { WarehouseId, WarehouseItem } from '../../models/shipment.model';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import { ModalShellComponent } from '../../presentation/ui/molecules/modal-shell/modal-shell.component';
import {
  KpiStatCardItem,
  KpiStatRibbonComponent,
} from '../../presentation/ui/organisms/kpi-stat-ribbon/kpi-stat-ribbon.component';

@Component({
  selector: 'app-warehouse-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusPillComponent,
    PaginationBarComponent,
    ModalShellComponent,
    KpiStatRibbonComponent,
  ],
  templateUrl: './warehouse-view.component.html',
  styleUrl: './warehouse-view.component.css',
})
export class WarehouseViewComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly items = this.shipmentService.warehouseItems;
  readonly movements = this.shipmentService.warehouseMovements;

  searchQuery = signal<string>('');
  filterWarehouse = signal<WarehouseId | 'ALL'>('ALL');
  filterState = signal<string>('ALL');

  showReceiptModal = false;
  dispatchTarget = signal<WarehouseItem | null>(null);

  whPage = signal(1);
  whPageSize = signal(6);

  receiptForm: {
    bodegaId: WarehouseId;
    clienteId: string;
    refArlogs?: string;
    ordenCompra: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    pesoKg: number;
    ubicacionRack: string;
  } = {
    bodegaId: 'BODEGA_1',
    clienteId: 'CLI-001',
    refArlogs: '',
    ordenCompra: '',
    descripcion: '',
    cantidad: 10,
    unidad: 'Cajas',
    pesoKg: 100,
    ubicacionRack: 'RACK-A01',
  };

  dispatchForm = {
    guiaRemision: '',
    cantidadSalida: 0,
    transporteInland: '',
    observacion: '',
  };

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const wh = this.filterWarehouse();
    const st = this.filterState();
    return this.items().filter((i) => {
      if (wh !== 'ALL' && i.bodegaId !== wh) return false;
      if (st !== 'ALL' && i.estado !== st) return false;
      if (!q) return true;
      return (
        i.id.toLowerCase().includes(q) ||
        i.ordenCompra.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        i.cliente.toLowerCase().includes(q) ||
        i.ubicacionRack.toLowerCase().includes(q) ||
        (i.ultimaGuiaRemision?.toLowerCase().includes(q) ?? false)
      );
    });
  });

  readonly totalWhPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.whPageSize())),
  );

  readonly paginatedItems = computed(() => {
    const page = Math.min(this.whPage(), this.totalWhPages());
    const start = (page - 1) * this.whPageSize();
    return this.filteredItems().slice(start, start + this.whPageSize());
  });

  readonly summary = computed(() => {
    const list = this.items();
    const b1 = list.filter((i) => i.bodegaId === 'BODEGA_1');
    const b2 = list.filter((i) => i.bodegaId === 'BODEGA_2');
    const b1Units = b1.reduce((acc, i) => acc + i.cantidadDisponible, 0);
    const b2Units = b2.reduce((acc, i) => acc + i.cantidadDisponible, 0);
    return {
      b1Units,
      b2Units,
      b1Lots: b1.filter((i) => i.cantidadDisponible > 0).length,
      b2Lots: b2.filter((i) => i.cantidadDisponible > 0).length,
      totalAvailable: b1Units + b2Units,
    };
  });

  readonly kpiItems = computed<readonly KpiStatCardItem[]>(() => {
    const s = this.summary();
    return [
      {
        label: 'Bodega Norte (GYE)',
        value: `${s.b1Units} u.`,
        icon: 'bi-building',
        iconBgClass: 'bg-slate-100 text-dark',
        valueColorClass: 'text-dark',
      },
      {
        label: 'Bodega Sur (Puerto)',
        value: `${s.b2Units} u.`,
        icon: 'bi-building-check',
        iconBgClass: 'bg-blue-50 text-primary',
        valueColorClass: 'text-primary',
      },
      {
        label: 'Saldo Disponible',
        value: `${s.totalAvailable} u.`,
        icon: 'bi-boxes',
        iconBgClass: 'bg-emerald-50 text-success',
        valueColorClass: 'text-success',
      },
      {
        label: 'Movimientos',
        value: this.movements().length,
        icon: 'bi-file-earmark-text',
        iconBgClass: 'bg-amber-50 text-warning',
        valueColorClass: 'text-dark',
      },
    ];
  });

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterWarehouse.set('ALL');
    this.filterState.set('ALL');
    this.whPage.set(1);
    this.toastService.info('Filtros restablecidos', 'Mostrando las 2 bodegas y todo el Kardex.');
  }

  openReceiptModal(): void {
    this.receiptForm = {
      bodegaId: 'BODEGA_1',
      clienteId: 'CLI-001',
      refArlogs: 'I902-2026',
      ordenCompra: '',
      descripcion: '',
      cantidad: 12,
      unidad: 'Cajas',
      pesoKg: 180,
      ubicacionRack: 'RACK-A06',
    };
    this.showReceiptModal = true;
  }

  submitReceipt(): void {
    if (!this.receiptForm.ordenCompra.trim() || !this.receiptForm.descripcion.trim()) {
      this.toastService.error('Incorrecto', 'Complete Orden de Compra y descripción del producto.');
      return;
    }
    const cliente =
      this.receiptForm.clienteId === 'CLI-001'
        ? 'Industrias Andinas S.A.'
        : 'Comercial Pacífico Cía. Ltda.';
    try {
      const created = this.shipmentService.registerWarehouseReceipt({
        bodegaId: this.receiptForm.bodegaId,
        clienteId: this.receiptForm.clienteId,
        cliente,
        refArlogs: this.receiptForm.refArlogs || 'DIRECTO-BOD',
        ordenCompra: this.receiptForm.ordenCompra,
        descripcion: this.receiptForm.descripcion,
        cantidad: this.receiptForm.cantidad,
        unidad: this.receiptForm.unidad,
        pesoKg: this.receiptForm.pesoKg,
        ubicacionRack: this.receiptForm.ubicacionRack,
      });
      this.showReceiptModal = false;
      this.toastService.success(
        'Correcto — Ingreso Kardex',
        `${created.id} registrado en ${created.bodegaNombre} (${created.cantidadInicial} ${created.unidad}).`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar ingreso.';
      this.toastService.error('Incorrecto', message);
    }
  }

  openDispatchModal(item: WarehouseItem): void {
    this.dispatchTarget.set(item);
    const nextGuia = 120 + this.movements().length + 1;
    this.dispatchForm = {
      guiaRemision: `GR-001-${nextGuia.toString().padStart(4, '0')}`,
      cantidadSalida: item.cantidadDisponible,
      transporteInland: 'Camión Hino / Placa GBD-4512',
      observacion: 'Despacho autorizado a planta cliente',
    };
  }

  submitDispatch(): void {
    const target = this.dispatchTarget();
    if (!target) return;
    try {
      const updated = this.shipmentService.dispatchWarehouseItem({
        itemId: target.id,
        cantidadSalida: this.dispatchForm.cantidadSalida,
        guiaRemision: this.dispatchForm.guiaRemision,
        transporteInland: this.dispatchForm.transporteInland,
        observacion: this.dispatchForm.observacion,
      });
      this.dispatchTarget.set(null);
      this.toastService.success(
        'Correcto — Guía de Remisión Emitida',
        `Guía ${updated.ultimaGuiaRemision} generada. Saldo disponible: ${updated.cantidadDisponible} ${updated.unidad}.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar el despacho.';
      this.toastService.error('Incorrecto', message);
    }
  }
}
