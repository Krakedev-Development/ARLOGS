import {
  AuditEntry,
  Quotation,
  RoleUser,
  ScreenId,
  ShipmentJob,
  UserRole,
  WarehouseItem,
  WarehouseMovement,
} from '../../models/shipment.model';

export class SupabasePayloadBuilder {
  static buildQuotationInsert(q: Quotation, seq: number): Record<string, unknown> {
    return {
      apq_id: q.id,
      apq_sequence_number: seq,
      apq_quote_year: new Date().getFullYear(),
      apq_client_id: q.clienteId,
      apq_service_type: q.servicio,
      apq_service_prefix: q.serviceCode,
      apq_shipper_name: q.shipper,
      apq_origin_country: q.paisOrigen,
      apq_loading_port: q.puertoEmbarque,
      apq_incoterm: q.incoterm,
      apq_purchase_orders: q.ordenesCompra,
      apq_customs_by_arlogs: q.aduanaPorArlogs,
      apq_quoted_date: q.fechaCotizacion,
      apq_status: q.estado,
      apq_quoted_sale_amount: q.valorVentaCotizado ?? 0,
      apq_estimated_cost_amount: q.costoEstimadoCotizado ?? 0,
      apq_payment_term_days: q.plazoPagoDias ?? 0,
    };
  }

  static buildQuotationPatch(patch: Partial<Quotation>): Record<string, unknown> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.clienteId !== undefined) dbPatch['apq_client_id'] = patch.clienteId;
    if (patch.servicio !== undefined) dbPatch['apq_service_type'] = patch.servicio;
    if (patch.serviceCode !== undefined) dbPatch['apq_service_prefix'] = patch.serviceCode;
    if (patch.shipper !== undefined) dbPatch['apq_shipper_name'] = patch.shipper;
    if (patch.paisOrigen !== undefined) dbPatch['apq_origin_country'] = patch.paisOrigen;
    if (patch.puertoEmbarque !== undefined) dbPatch['apq_loading_port'] = patch.puertoEmbarque;
    if (patch.incoterm !== undefined) dbPatch['apq_incoterm'] = patch.incoterm;
    if (patch.ordenesCompra !== undefined) dbPatch['apq_purchase_orders'] = patch.ordenesCompra;
    if (patch.aduanaPorArlogs !== undefined)
      dbPatch['apq_customs_by_arlogs'] = patch.aduanaPorArlogs;
    return dbPatch;
  }

  static buildShipmentInsert(job: ShipmentJob): Record<string, unknown> {
    return {
      aos_ref: job.refArlogs,
      aos_quotation_id: job.qrCode,
      aos_client_id: job.clienteId,
      aos_service_type: job.servicio,
      aos_service_prefix: job.serviceCode,
      aos_customs_by_arlogs: job.aduanaPorArlogs,
      aos_shipper_name: job.shipper,
      aos_origin_country: job.paisOrigen,
      aos_loading_port: job.puertoEmbarque,
      aos_incoterm: job.incoterm,
      aos_master_waybill_bl: job.guiaMaster,
      aos_house_awb_hbl: job.hawbHbl,
      aos_container_number: job.contenedor,
      aos_origin_weight_kg: job.pesoOrigen,
      aos_received_weight_kg: job.pesoRecibido,
      aos_payment_responsible: job.responsablePago ?? null,
      aos_customs_regime: job.regimenAduana ?? null,
      aos_customs_district: job.distritoAduana ?? null,
      aos_customs_channel: job.aforoAduana ?? null,
      aos_quoted_sale_amount: job.valorVentaCotizado ?? 0,
      aos_estimated_cost_amount: job.costoEstimadoCotizado ?? 0,
      aos_payment_term_days: job.plazoPagoDias ?? 0,
      aos_collection_status: job.estadoCobro ?? 'PENDIENTE_FACTURAR',
    };
  }

  static buildShipmentAndMilestonePatches(patch: Partial<ShipmentJob>): {
    sPatch: Record<string, unknown>;
    mPatch: Record<string, unknown>;
  } {
    const sPatch: Record<string, unknown> = {};
    if (patch.guiaMaster !== undefined) sPatch['aos_master_waybill_bl'] = patch.guiaMaster;
    if (patch.hawbHbl !== undefined) sPatch['aos_house_awb_hbl'] = patch.hawbHbl;
    if (patch.contenedor !== undefined) sPatch['aos_container_number'] = patch.contenedor;
    if (patch.pesoOrigen !== undefined) sPatch['aos_origin_weight_kg'] = patch.pesoOrigen;
    if (patch.pesoRecibido !== undefined) sPatch['aos_received_weight_kg'] = patch.pesoRecibido;
    if (patch.facturaNumero !== undefined) sPatch['aos_invoice_number'] = patch.facturaNumero;
    if (patch.valorFacturadoReal !== undefined)
      sPatch['aos_actual_billed_amount'] = patch.valorFacturadoReal;
    if (patch.costoReal !== undefined) sPatch['aos_actual_cost_amount'] = patch.costoReal;
    if (patch.estadoCobro !== undefined) sPatch['aos_collection_status'] = patch.estadoCobro;
    if (patch.fechaFactura !== undefined) sPatch['aos_invoice_date'] = patch.fechaFactura;

    const mPatch: Record<string, unknown> = {};
    if (patch.h1_asignacion !== undefined) mPatch['aom_h1_assignment_date'] = patch.h1_asignacion;
    if (patch.h2_respuestaShipper !== undefined)
      mPatch['aom_h2_shipper_reply_date'] = patch.h2_respuestaShipper;
    if (patch.h3_cargaLista !== undefined) mPatch['aom_h3_cargo_ready_date'] = patch.h3_cargaLista;
    if (patch.h4_zarpeAtd !== undefined) mPatch['aom_h4_departure_atd_date'] = patch.h4_zarpeAtd;
    if (patch.h5_arriboAta !== undefined) mPatch['aom_h5_arrival_ata_date'] = patch.h5_arriboAta;
    if (patch.h6_pesoRecibido !== undefined)
      mPatch['aom_h6_weight_received_date'] = patch.h6_pesoRecibido;
    if (patch.h7_declaracion !== undefined) mPatch['aom_h7_declaration_date'] = patch.h7_declaracion;
    if (patch.h8_pagoLiquidacion !== undefined)
      mPatch['aom_h8_payment_date'] = patch.h8_pagoLiquidacion;
    if (patch.h9_salidaAutorizada !== undefined)
      mPatch['aom_h9_authorized_exit_date'] = patch.h9_salidaAutorizada;
    if (patch.h10_informeSalida !== undefined)
      mPatch['aom_h10_exit_report_date'] = patch.h10_informeSalida;

    return { sPatch, mPatch };
  }

  static buildWarehouseItemInsert(item: WarehouseItem): Record<string, unknown> {
    return {
      awi_id: item.id,
      awi_warehouse_code: item.bodegaId,
      awi_warehouse_name: item.bodegaNombre,
      awi_client_id: item.clienteId,
      awi_shipment_ref: item.refArlogs,
      awi_po_code: item.ordenCompra,
      awi_cargo_description: item.descripcion,
      awi_initial_qty: item.cantidadInicial,
      awi_available_qty: item.cantidadDisponible,
      awi_unit_of_measure: item.unidad,
      awi_weight_kg: item.pesoKg,
      awi_receipt_date: item.fechaIngreso,
      awi_rack_location: item.ubicacionRack,
      awi_status: item.estado,
    };
  }

  static buildWarehouseMovementInsert(mov: WarehouseMovement): Record<string, unknown> {
    return {
      awm_id: mov.id,
      awm_item_id: mov.itemId,
      awm_warehouse_name: mov.bodegaNombre,
      awm_movement_type: mov.tipo,
      awm_quantity: mov.cantidad,
      awm_remission_guide: mov.guiaRemision,
      awm_po_code: mov.ordenCompra,
      awm_client_name: mov.cliente,
      awm_cargo_description: mov.descripcion,
      awm_inland_transport: mov.transporteInland ?? null,
      awm_responsible_user: mov.responsable,
      awm_movement_timestamp: mov.fecha,
      awm_notes: mov.observacion,
    };
  }

  static buildAuditInsert(entry: AuditEntry): Record<string, unknown> {
    return {
      aal_id: entry.id,
      aal_event_timestamp: entry.timestamp,
      aal_actor_name: entry.usuario,
      aal_actor_email: entry.email,
      aal_actor_role: entry.rol,
      aal_category: entry.categoria,
      aal_target_entity: entry.entidad,
      aal_action_name: entry.accion,
      aal_change_details: entry.detalle,
    };
  }

  static buildUserInsert(u: RoleUser): Record<string, unknown> {
    return {
      asu_id: u.id,
      asu_username: u.email.split('@')[0] + '_' + Date.now().toString().slice(-4),
      asu_email: u.email,
      asu_password_hash: u.password,
      asu_profile_role: u.role,
      asu_status: u.activo ? 'ACTIVE' : 'SUSPENDED',
      asu_default_entity_id: u.clienteId ?? null,
      asu_full_name: u.nombre,
      asu_job_title: u.cargo,
      asu_avatar_icon: u.avatarIcon,
      asu_description: u.descripcion,
    };
  }

  static buildUserPatch(patch: Partial<RoleUser>): Record<string, unknown> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.nombre !== undefined) dbPatch['asu_full_name'] = patch.nombre;
    if (patch.email !== undefined) dbPatch['asu_email'] = patch.email;
    if (patch.password !== undefined) dbPatch['asu_password_hash'] = patch.password;
    if (patch.cargo !== undefined) dbPatch['asu_job_title'] = patch.cargo;
    if (patch.role !== undefined) dbPatch['asu_profile_role'] = patch.role;
    if (patch.activo !== undefined) dbPatch['asu_status'] = patch.activo ? 'ACTIVE' : 'SUSPENDED';
    if (patch.clienteId !== undefined) dbPatch['asu_default_entity_id'] = patch.clienteId;
    return dbPatch;
  }

  static buildRbacUpsert(
    role: UserRole,
    screenId: ScreenId,
    isAllowed: boolean,
  ): Record<string, unknown> {
    return { asr_role: role, asr_screen_id: screenId, asr_is_allowed: isAllowed };
  }
}
