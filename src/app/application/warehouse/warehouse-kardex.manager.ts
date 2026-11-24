import { RoleUser, WarehouseId, WarehouseItem, WarehouseMovement } from '../../models/shipment.model';

export class WarehouseKardexManager {
  static createReceiptItem(
    existingItems: readonly WarehouseItem[],
    input: {
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
    },
    todayIso: string,
  ): { item: WarehouseItem; nextSeq: number } {
    const existingWarehouseItem = existingItems.find((i) => i.bodegaId === input.bodegaId);
    const bodegaNombre = existingWarehouseItem?.bodegaNombre || input.bodegaId;
    const maxItemNum = existingItems.reduce((max, i) => {
      const m = /(\d+)$/i.exec(i.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const nextSeq = maxItemNum + 1;
    const id = `WHS-${nextSeq}`;

    const item: WarehouseItem = {
      id,
      bodegaId: input.bodegaId,
      bodegaNombre,
      clienteId: input.clienteId,
      cliente: input.cliente,
      refArlogs: input.refArlogs.trim().toUpperCase(),
      ordenCompra: input.ordenCompra.trim().toUpperCase(),
      descripcion: input.descripcion.trim(),
      cantidadInicial: Number(input.cantidad),
      cantidadDisponible: Number(input.cantidad),
      unidad: input.unidad.trim(),
      pesoKg: Number(input.pesoKg) || 0,
      fechaIngreso: todayIso,
      ubicacionRack: input.ubicacionRack.trim().toUpperCase(),
      estado: 'EN_BODEGA',
    };

    return { item, nextSeq };
  }

  static buildMovementRecord(
    existingMovements: readonly WarehouseMovement[],
    m: Omit<WarehouseMovement, 'id' | 'fecha'>,
  ): WarehouseMovement {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const maxMov = existingMovements.reduce((max, x) => {
      const match = /(\d+)$/i.exec(x.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return { id: `MOV-${maxMov + 1}`, fecha, ...m };
  }

  static assertWarehousePermission(user: RoleUser, actionLabel: string): void {
    if (
      user.role !== 'bodegas' &&
      user.role !== 'operaciones' &&
      user.role !== 'gerencia' &&
      user.role !== 'admin'
    ) {
      throw new Error(`No tiene permisos para ${actionLabel}.`);
    }
  }
}
