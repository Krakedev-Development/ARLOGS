import { Injectable, signal, computed, inject } from '@angular/core';
import {
  ShipmentJob,
  Quotation,
  RoleUser,
  INITIAL_SESSION_PLACEHOLDER,
  UserRole,
  ServiceType,
  WarehouseId,
  WarehouseItem,
  WarehouseMovement,
} from '../models/shipment.model';
import { AuditService } from './audit.service';
import { NETWORK_CONFIG } from '../core/config/api-endpoints.config';
import { MilestoneRulesEngine } from '../domain/services/milestone-rules.engine';
import { ShipmentFactory } from '../application/shipments/shipment.factory';
import { WarehouseKardexManager } from '../application/warehouse/warehouse-kardex.manager';
import { XlsxSpreadsheetExporterAdapter } from '../infrastructure/exporters/xlsx-spreadsheet-exporter.adapter';
import { ArlogsRemoteSyncAdapter } from '../infrastructure/http/arlogs-remote-sync.adapter';

@Injectable({
  providedIn: 'root',
})
export class ShipmentService {
  private readonly auditService = inject(AuditService);
  private readonly spreadsheetExporter = inject(XlsxSpreadsheetExporterAdapter);
  private readonly remoteSync = inject(ArlogsRemoteSyncAdapter);

  readonly referenceDate = new Date(`${NETWORK_CONFIG.simulatedReferenceDateIso}T00:00:00`);
  readonly jobs = signal<ShipmentJob[]>([]);
  readonly quotations = signal<Quotation[]>([]);
  readonly warehouseItems = signal<WarehouseItem[]>([]);
  readonly warehouseMovements = signal<WarehouseMovement[]>([]);
  readonly currentUser = signal<RoleUser>(INITIAL_SESSION_PLACEHOLDER);
  readonly alertThresholdDays = signal<number>(NETWORK_CONFIG.defaultSlaThresholdDays);
  readonly isLoadingData = signal<boolean>(true);

  readonly authorizedJobs = computed(() => {
    const user = this.currentUser();
    const all = this.jobs();
    if (user.role === 'cliente_a' || user.role === 'cliente_b') {
      const targetClientId = user.clienteId || (user.role === 'cliente_a' ? 'CLI-001' : 'CLI-002');
      return all.filter((j) => j.clienteId === targetClientId);
    }
    return all;
  });

  constructor() {
    void this.hydrateFromDatabase();
  }

  async hydrateFromDatabase(): Promise<void> {
    this.isLoadingData.set(true);
    try {
      const [threshold, jobs, quotes, items, movements] = await Promise.all([
        this.remoteSync.fetchSlaThreshold(),
        this.remoteSync.fetchShipments(),
        this.remoteSync.fetchQuotations(),
        this.remoteSync.fetchWarehouseItems(),
        this.remoteSync.fetchWarehouseMovements(),
      ]);
      this.alertThresholdDays.set(threshold);
      this.jobs.set(jobs.map((j) => this.calculateJobMetrics(j, threshold)));
      this.quotations.set(quotes);
      this.warehouseItems.set(items);
      this.warehouseMovements.set(movements);
    } finally {
      this.isLoadingData.set(false);
    }
  }

  setCurrentUser(user: RoleUser): void {
    this.currentUser.set(user);
  }

  setAlertThreshold(days: number): void {
    this.assertRoles(
      ['gerencia', 'admin'],
      'Solo el perfil de Gerencia o Administrador puede modificar el umbral de alerta.',
    );
    const prev = this.alertThresholdDays();
    this.alertThresholdDays.set(days);
    this.jobs.update((list) => list.map((job) => this.calculateJobMetrics(job, days)));
    if (prev !== days) {
      void this.remoteSync.pushSlaThreshold(days);
      this.audit(
        'GERENCIA_SLA',
        'SLA_UMBRAL',
        'Cambio de Umbral de Alerta',
        `Límite días abiertos: ${prev}d -> ${days}d`,
      );
    }
  }

  isMilestoneApplicable(
    service: ServiceType,
    aduanaPorArlogs: 'SI' | 'NO' | 'N/A',
    milestoneNum: number,
  ): boolean {
    return MilestoneRulesEngine.isMilestoneApplicable(service, aduanaPorArlogs, milestoneNum);
  }

  getFinalMilestoneNum(service: ServiceType, aduanaPorArlogs: 'SI' | 'NO' | 'N/A'): number {
    return MilestoneRulesEngine.getFinalMilestoneNum(service, aduanaPorArlogs);
  }

  calculateCalendarDays(
    date1Str: string | null | undefined,
    date2Str: string | null | undefined,
  ): number | 'N/A' {
    return MilestoneRulesEngine.calculateCalendarDays(date1Str, date2Str);
  }

  calculateJobMetrics(job: ShipmentJob, threshold: number): ShipmentJob {
    return MilestoneRulesEngine.calculateJobMetrics(job, threshold, this.referenceDate);
  }

  getJobByRef(refArlogs: string): ShipmentJob | null {
    const user = this.currentUser();
    const job = this.jobs().find((j) => j.refArlogs.toLowerCase() === refArlogs.toLowerCase());
    if (!job) return null;
    if (user.role === 'cliente_a' || user.role === 'cliente_b') {
      const targetClientId = user.clienteId || (user.role === 'cliente_a' ? 'CLI-001' : 'CLI-002');
      if (job.clienteId !== targetClientId) {
        this.audit(
          'SEGURIDAD_ROLES',
          refArlogs,
          'Intento de Acceso No Autorizado Bloqueado',
          `El perfil ${user.role} intentó consultar ${refArlogs}`,
        );
        return null;
      }
    }
    return job;
  }

  updateJobMilestones(refArlogs: string, changes: Partial<ShipmentJob>): ShipmentJob {
    this.assertRoles(
      ['operaciones', 'gerencia', 'admin'],
      'Solo el perfil de Operaciones puede registrar fechas e hitos.',
    );
    let updatedJob: ShipmentJob | null = null;
    const diffs: string[] = [];

    this.jobs.update((list) =>
      list.map((item) => {
        if (item.refArlogs !== refArlogs) return item;
        (Object.keys(changes) as (keyof ShipmentJob)[]).forEach((k) => {
          const oldVal = item[k] ?? 'vacío';
          const newVal = changes[k] ?? 'vacío';
          if (oldVal !== newVal) diffs.push(`${String(k)}: ${oldVal} -> ${newVal}`);
        });
        updatedJob = this.calculateJobMetrics(
          { ...item, ...changes },
          this.alertThresholdDays(),
        );
        return updatedJob;
      }),
    );
    if (!updatedJob) throw new Error(`Trabajo ${refArlogs} no encontrado.`);
    if (diffs.length > 0) {
      void this.remoteSync.pushMilestoneOrBillingPatch(refArlogs, changes);
      this.audit(
        'OPERACION_HITOS',
        refArlogs,
        'Modificación Operativa / Hitos',
        diffs.slice(0, 4).join(' | ') + (diffs.length > 4 ? ` (+${diffs.length - 4} más)` : ''),
      );
    }
    return updatedJob;
  }

  createQuotation(data: Omit<Quotation, 'id' | 'estado'>): Quotation {
    this.assertRoles(['pricing', 'gerencia', 'admin'], 'Solo Pricing puede crear cotizaciones.');
    const maxSeq = this.quotations().reduce((max, q) => {
      const m = /^QR-(\d+)-\d+$/i.exec(q.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 23);
    const nextSeq = maxSeq + 1;
    const qrId = `QR-${nextSeq.toString().padStart(3, '0')}-26`;
    const newQuote: Quotation = { ...data, id: qrId, estado: 'PENDIENTE' };
    this.quotations.update((list) => [newQuote, ...list]);
    void this.remoteSync.pushCreateQuotation(newQuote, nextSeq);
    this.audit(
      'PRICING_QR',
      qrId,
      'Nueva Cotización QR',
      `Cliente: ${data.cliente} | ${data.servicio} | OC: ${data.ordenesCompra.join(', ')}`,
    );
    return newQuote;
  }

  approveQuotation(quotationId: string): ShipmentJob {
    this.assertRoles(['pricing', 'gerencia', 'admin'], 'Solo Pricing puede aprobar cotizaciones.');
    const quote = this.quotations().find((q) => q.id === quotationId);
    if (!quote) throw new Error('Cotización no encontrada.');
    if (quote.estado === 'APROBADA')
      throw new Error('Esta cotización ya fue aprobada y tiene una referencia activa.');

    const newRef = ShipmentFactory.nextRefForPrefix(this.jobs(), quote.serviceCode);
    const todayIso = this.referenceDate.toISOString().split('T')[0];
    const calculatedJob = this.calculateJobMetrics(
      ShipmentFactory.buildFromApprovedQuotation(quote, newRef, todayIso),
      this.alertThresholdDays(),
    );

    this.quotations.update((list) =>
      list.map((q) =>
        q.id === quotationId ? { ...q, estado: 'APROBADA', refArlogsGenerada: newRef } : q,
      ),
    );
    this.jobs.update((list) => [calculatedJob, ...list]);
    void this.remoteSync.pushApproveQuotation(quotationId, calculatedJob);
    this.audit(
      'PRICING_QR',
      newRef,
      'Aprobación de Cotización',
      `${quotationId} aprobada -> Referencia ${newRef} transferida a Operaciones`,
    );
    return calculatedJob;
  }

  updateQuotation(
    quotationId: string,
    patch: Partial<Omit<Quotation, 'id' | 'estado' | 'refArlogsGenerada'>>,
  ): Quotation {
    this.assertRoles(
      ['pricing', 'gerencia', 'admin'],
      'No tiene permisos para editar cotizaciones.',
    );
    const existing = this.quotations().find((q) => q.id === quotationId);
    if (!existing) throw new Error('Cotización no encontrada.');
    if (existing.estado === 'APROBADA')
      throw new Error('Una cotización aprobada no puede editarse.');

    let updated!: Quotation;
    this.quotations.update((list) =>
      list.map((q) => (q.id === quotationId ? (updated = { ...q, ...patch }) : q)),
    );
    void this.remoteSync.pushUpdateQuotation(quotationId, patch);
    this.audit(
      'PRICING_QR',
      quotationId,
      'Edición de Cotización QR',
      `Cliente: ${updated.cliente} | ${updated.servicio} | Origen: ${updated.puertoEmbarque}`,
    );
    return updated;
  }

  deleteQuotation(quotationId: string): void {
    this.assertRoles(
      ['pricing', 'gerencia', 'admin'],
      'No tiene permisos para eliminar cotizaciones.',
    );
    const existing = this.quotations().find((q) => q.id === quotationId);
    if (!existing) throw new Error('Cotización no encontrada.');
    if (existing.estado === 'APROBADA')
      throw new Error('No se puede eliminar una cotización ya aprobada con referencia operativa.');

    this.quotations.update((list) => list.filter((q) => q.id !== quotationId));
    void this.remoteSync.pushDeleteQuotation(quotationId);
    this.audit(
      'PRICING_QR',
      quotationId,
      'Eliminación de Cotización QR',
      `Cotización de ${existing.cliente} (${existing.servicio}) removida de bandeja`,
    );
  }

  createDirectShipment(
    data: Parameters<typeof ShipmentFactory.buildFromDirectInput>[0],
  ): ShipmentJob {
    this.assertRoles(
      ['operaciones', 'gerencia', 'admin'],
      'Solo Operaciones, Gerencia o Administración pueden crear embarques.',
    );
    const newRef = ShipmentFactory.nextRefForPrefix(this.jobs(), data.serviceCode);
    const todayIso = this.referenceDate.toISOString().split('T')[0];
    const calculated = this.calculateJobMetrics(
      ShipmentFactory.buildFromDirectInput(data, newRef, todayIso),
      this.alertThresholdDays(),
    );
    this.jobs.update((list) => [calculated, ...list]);
    void this.remoteSync.pushCreateDirectShipment(calculated);
    this.audit(
      'OPERACION_HITOS',
      newRef,
      'Alta de Embarque Operativo',
      `Cliente: ${data.cliente} | ${data.servicio} | OC: ${data.ordenesCompra.join(', ')}`,
    );
    return calculated;
  }

  deleteShipment(refArlogs: string): void {
    this.assertRoles(
      ['operaciones', 'gerencia', 'admin'],
      'No tiene permisos para eliminar embarques.',
    );
    const existing = this.jobs().find((j) => j.refArlogs === refArlogs);
    if (!existing) throw new Error(`Embarque ${refArlogs} no encontrado.`);
    this.jobs.update((list) => list.filter((j) => j.refArlogs !== refArlogs));
    void this.remoteSync.pushDeleteShipment(refArlogs);
    this.audit(
      'OPERACION_HITOS',
      refArlogs,
      'Eliminación de Embarque',
      `Referencia ${refArlogs} (${existing.cliente}) eliminada del seguimiento`,
    );
  }

  updateBilling(
    refArlogs: string,
    billing: {
      facturaNumero: string;
      valorFacturadoReal: number;
      costoReal: number;
      estadoCobro: 'FACTURADA' | 'COBRADA' | 'VENCIDA';
    },
  ): ShipmentJob {
    this.assertRoles(
      ['contabilidad', 'gerencia', 'admin'],
      'Solo Contabilidad, Gerencia o Administración pueden emitir facturas o cobros.',
    );
    let updatedJob: ShipmentJob | null = null;
    const today = this.referenceDate.toISOString().split('T')[0];

    this.jobs.update((list) =>
      list.map((j) => {
        if (j.refArlogs !== refArlogs) return j;
        updatedJob = {
          ...j,
          facturaNumero: billing.facturaNumero.trim().toUpperCase(),
          valorFacturadoReal: Number(billing.valorFacturadoReal),
          costoReal: Number(billing.costoReal),
          estadoCobro: billing.estadoCobro,
          fechaFactura: j.fechaFactura ?? today,
        };
        return updatedJob;
      }),
    );
    if (!updatedJob) throw new Error(`Referencia ${refArlogs} no encontrada.`);
    void this.remoteSync.pushMilestoneOrBillingPatch(refArlogs, updatedJob);
    const profitReal = billing.valorFacturadoReal - billing.costoReal;
    this.audit(
      'FACTURACION',
      refArlogs,
      billing.estadoCobro === 'COBRADA' ? 'Registro de Cobro' : 'Emisión de Factura',
      `${billing.facturaNumero} | Facturado $${billing.valorFacturadoReal.toFixed(0)} | Profit $${profitReal.toFixed(0)} | Estado: ${billing.estadoCobro}`,
    );
    return updatedJob;
  }

  registerWarehouseReceipt(input: {
    bodegaId: WarehouseId;
    clienteId: string;
    cliente: string;
    refArlogs: string;
    ordenCompra: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    pesoKg: number;
    ubicacionRack: string;
    observacion?: string;
  }): WarehouseItem {
    const user = this.currentUser();
    WarehouseKardexManager.assertWarehousePermission(user, 'registrar ingresos en bodega');
    const { item, nextSeq } = WarehouseKardexManager.createReceiptItem(
      this.warehouseItems(),
      input,
      this.referenceDate.toISOString().split('T')[0],
    );
    this.warehouseItems.update((list) => [item, ...list]);
    const movement = WarehouseKardexManager.buildMovementRecord(this.warehouseMovements(), {
      itemId: item.id,
      bodegaNombre: item.bodegaNombre,
      tipo: 'INGRESO',
      cantidad: item.cantidadInicial,
      guiaRemision: `ING-${input.bodegaId === 'BODEGA_1' ? 'B1' : 'B2'}-${nextSeq}`,
      ordenCompra: item.ordenCompra,
      cliente: item.cliente,
      descripcion: item.descripcion,
      responsable: user.nombre,
      observacion: input.observacion?.trim() || 'Conteo físico e ingreso a Kardex',
    });
    this.warehouseMovements.update((list) => [movement, ...list]);
    void this.remoteSync.pushWarehouseReceipt(item, movement);
    this.audit(
      'BODEGA_KARDEX',
      `${item.id} (${item.ordenCompra})`,
      'Ingreso físico a Bodega',
      `${item.bodegaNombre} | ${item.cantidadInicial} ${item.unidad} | ${item.descripcion}`,
    );
    return item;
  }

  dispatchWarehouseItem(input: {
    itemId: string;
    cantidadSalida: number;
    guiaRemision: string;
    transporteInland: string;
    observacion?: string;
  }): WarehouseItem {
    const user = this.currentUser();
    WarehouseKardexManager.assertWarehousePermission(user, 'emitir guías de remisión');
    const existing = this.warehouseItems().find((i) => i.id === input.itemId);
    if (!existing) throw new Error('Ítem de Kardex no encontrado.');
    const qty = Number(input.cantidadSalida);
    if (!qty || qty <= 0 || qty > existing.cantidadDisponible)
      throw new Error(
        `Cantidad inválida. Disponible actual: ${existing.cantidadDisponible} ${existing.unidad}.`,
      );
    const remision = input.guiaRemision.trim().toUpperCase();
    if (!remision) throw new Error('Debe indicar el número de Guía de Remisión.');

    let updatedItem!: WarehouseItem;
    this.warehouseItems.update((list) =>
      list.map((i) =>
        i.id !== input.itemId
          ? i
          : (updatedItem = {
            ...i,
            cantidadDisponible: i.cantidadDisponible - qty,
            estado: i.cantidadDisponible - qty === 0 ? 'DESPACHADO' : 'PARCIAL',
            ultimaGuiaRemision: remision,
          }),
      ),
    );
    const movement = WarehouseKardexManager.buildMovementRecord(this.warehouseMovements(), {
      itemId: existing.id,
      bodegaNombre: existing.bodegaNombre,
      tipo: 'SALIDA',
      cantidad: qty,
      guiaRemision: remision,
      ordenCompra: existing.ordenCompra,
      cliente: existing.cliente,
      descripcion: existing.descripcion,
      transporteInland: input.transporteInland.trim() || 'Inland Local',
      responsable: user.nombre,
      observacion: input.observacion?.trim() || 'Despacho con Guía de Remisión',
    });
    this.warehouseMovements.update((list) => [movement, ...list]);
    void this.remoteSync.pushWarehouseDispatch(updatedItem, movement);
    this.audit(
      'BODEGA_KARDEX',
      `${remision} (${existing.ordenCompra})`,
      'Salida Kardex / Guía de Remisión',
      `${existing.bodegaNombre} | Retiro: ${qty} ${existing.unidad} (Saldo: ${updatedItem.cantidadDisponible}) | ${input.transporteInland}`,
    );
    return updatedItem;
  }

  async exportToExcel(filteredJobs: ShipmentJob[]): Promise<void> {
    await this.spreadsheetExporter.exportShipments(filteredJobs, this.currentUser().role);
  }

  private assertRoles(allowed: readonly UserRole[], errorMessage: string): void {
    if (!allowed.includes(this.currentUser().role)) throw new Error(errorMessage);
  }

  private audit(
    categoria: Parameters<AuditService['record']>[0]['categoria'],
    entidad: string,
    accion: string,
    detalle: string,
  ): void {
    const user = this.currentUser();
    this.auditService.record({
      usuario: user.nombre,
      email: user.email,
      rol: user.role,
      categoria,
      entidad,
      accion,
      detalle,
    });
  }
}
