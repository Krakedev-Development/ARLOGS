import {
  AuditCategory,
  AuditEntry,
  Quotation,
  RoleUser,
  ScreenId,
  ServicePrefix,
  ServiceType,
  ShipmentJob,
  UserRole,
  WarehouseId,
  WarehouseItem,
  WarehouseMovement,
} from '../../models/shipment.model';

export class SupabaseRowMapper {
  static toShipmentJob(
    s: Record<string, unknown>,
    m: Record<string, unknown> | undefined,
    pos: string[],
    clientName: string,
  ): ShipmentJob {
    return {
      refArlogs: String(s['aos_ref'] ?? ''),
      qrCode: String(s['aos_quotation_id'] ?? ''),
      clienteId: String(s['aos_client_id'] ?? ''),
      cliente: clientName,
      servicio: String(s['aos_service_type'] ?? 'AEREO') as ServiceType,
      serviceCode: String(s['aos_service_prefix'] ?? 'A') as ServicePrefix,
      aduanaPorArlogs: String(s['aos_customs_by_arlogs'] ?? 'SI') as 'SI' | 'NO' | 'N/A',
      shipper: String(s['aos_shipper_name'] ?? ''),
      paisOrigen: String(s['aos_origin_country'] ?? ''),
      puertoEmbarque: String(s['aos_loading_port'] ?? ''),
      incoterm: String(s['aos_incoterm'] ?? 'FOB'),
      ordenesCompra: pos,
      guiaMaster: String(s['aos_master_waybill_bl'] ?? ''),
      hawbHbl: String(s['aos_house_awb_hbl'] ?? ''),
      contenedor: String(s['aos_container_number'] ?? ''),
      pesoOrigen: s['aos_origin_weight_kg'] !== null ? Number(s['aos_origin_weight_kg']) : null,
      pesoRecibido:
        s['aos_received_weight_kg'] !== null ? Number(s['aos_received_weight_kg']) : null,
      responsablePago: s['aos_payment_responsible']
        ? String(s['aos_payment_responsible'])
        : undefined,
      regimenAduana: s['aos_customs_regime'] ? String(s['aos_customs_regime']) : undefined,
      distritoAduana: s['aos_customs_district'] ? String(s['aos_customs_district']) : undefined,
      aforoAduana: s['aos_customs_channel'] ? String(s['aos_customs_channel']) : undefined,
      valorVentaCotizado:
        s['aos_quoted_sale_amount'] !== null ? Number(s['aos_quoted_sale_amount']) : 0,
      costoEstimadoCotizado:
        s['aos_estimated_cost_amount'] !== null ? Number(s['aos_estimated_cost_amount']) : 0,
      plazoPagoDias: s['aos_payment_term_days'] !== null ? Number(s['aos_payment_term_days']) : 0,
      facturaNumero: s['aos_invoice_number'] ? String(s['aos_invoice_number']) : undefined,
      valorFacturadoReal:
        s['aos_actual_billed_amount'] !== null ? Number(s['aos_actual_billed_amount']) : undefined,
      costoReal:
        s['aos_actual_cost_amount'] !== null ? Number(s['aos_actual_cost_amount']) : undefined,
      estadoCobro: (s['aos_collection_status'] as ShipmentJob['estadoCobro']) ?? 'PENDIENTE_FACTURAR',
      fechaFactura: s['aos_invoice_date'] ? String(s['aos_invoice_date']) : undefined,
      h1_asignacion: m?.['aom_h1_assignment_date'] ? String(m['aom_h1_assignment_date']) : null,
      h2_respuestaShipper: m?.['aom_h2_shipper_reply_date']
        ? String(m['aom_h2_shipper_reply_date'])
        : null,
      h3_cargaLista: m?.['aom_h3_cargo_ready_date'] ? String(m['aom_h3_cargo_ready_date']) : null,
      h4_zarpeAtd: m?.['aom_h4_departure_atd_date'] ? String(m['aom_h4_departure_atd_date']) : null,
      h5_arriboAta: m?.['aom_h5_arrival_ata_date'] ? String(m['aom_h5_arrival_ata_date']) : null,
      h6_pesoRecibido: m?.['aom_h6_weight_received_date']
        ? String(m['aom_h6_weight_received_date'])
        : null,
      h7_declaracion: m?.['aom_h7_declaration_date'] ? String(m['aom_h7_declaration_date']) : null,
      h8_pagoLiquidacion: m?.['aom_h8_payment_date'] ? String(m['aom_h8_payment_date']) : null,
      h9_salidaAutorizada: m?.['aom_h9_authorized_exit_date']
        ? String(m['aom_h9_authorized_exit_date'])
        : null,
      h10_informeSalida: m?.['aom_h10_exit_report_date']
        ? String(m['aom_h10_exit_report_date'])
        : null,
    };
  }

  static toQuotation(q: Record<string, unknown>, clientName: string): Quotation {
    return {
      id: String(q['apq_id'] ?? ''),
      clienteId: String(q['apq_client_id'] ?? ''),
      cliente: clientName,
      servicio: String(q['apq_service_type'] ?? 'AEREO') as ServiceType,
      serviceCode: String(q['apq_service_prefix'] ?? 'A') as ServicePrefix,
      shipper: String(q['apq_shipper_name'] ?? ''),
      paisOrigen: String(q['apq_origin_country'] ?? ''),
      puertoEmbarque: String(q['apq_loading_port'] ?? ''),
      incoterm: String(q['apq_incoterm'] ?? 'FOB'),
      ordenesCompra: Array.isArray(q['apq_purchase_orders'])
        ? q['apq_purchase_orders'].map(String)
        : [],
      aduanaPorArlogs: String(q['apq_customs_by_arlogs'] ?? 'SI') as 'SI' | 'NO' | 'N/A',
      fechaCotizacion: String(q['apq_quoted_date'] ?? ''),
      estado: String(q['apq_status'] ?? 'PENDIENTE') as 'PENDIENTE' | 'APROBADA',
      refArlogsGenerada: q['apq_generated_ref'] ? String(q['apq_generated_ref']) : undefined,
      valorVentaCotizado: Number(q['apq_quoted_sale_amount'] ?? 0),
      costoEstimadoCotizado: Number(q['apq_estimated_cost_amount'] ?? 0),
      plazoPagoDias: Number(q['apq_payment_term_days'] ?? 0),
    };
  }

  static toWarehouseItem(i: Record<string, unknown>, clientName: string): WarehouseItem {
    return {
      id: String(i['awi_id'] ?? ''),
      bodegaId: String(i['awi_warehouse_code'] ?? 'BODEGA_1') as WarehouseId,
      bodegaNombre: String(i['awi_warehouse_name'] ?? ''),
      clienteId: String(i['awi_client_id'] ?? ''),
      cliente: clientName,
      refArlogs: String(i['awi_shipment_ref'] ?? ''),
      ordenCompra: String(i['awi_po_code'] ?? ''),
      descripcion: String(i['awi_cargo_description'] ?? ''),
      cantidadInicial: Number(i['awi_initial_qty'] ?? 0),
      cantidadDisponible: Number(i['awi_available_qty'] ?? 0),
      unidad: String(i['awi_unit_of_measure'] ?? ''),
      pesoKg: Number(i['awi_weight_kg'] ?? 0),
      fechaIngreso: String(i['awi_receipt_date'] ?? ''),
      ubicacionRack: String(i['awi_rack_location'] ?? ''),
      estado: String(i['awi_status'] ?? 'EN_BODEGA') as WarehouseItem['estado'],
      ultimaGuiaRemision: i['awi_last_remission_guide']
        ? String(i['awi_last_remission_guide'])
        : undefined,
    };
  }

  static toWarehouseMovement(m: Record<string, unknown>): WarehouseMovement {
    return {
      id: String(m['awm_id'] ?? ''),
      itemId: String(m['awm_item_id'] ?? ''),
      bodegaNombre: String(m['awm_warehouse_name'] ?? ''),
      tipo: String(m['awm_movement_type'] ?? 'INGRESO') as 'INGRESO' | 'SALIDA',
      cantidad: Number(m['awm_quantity'] ?? 0),
      guiaRemision: String(m['awm_remission_guide'] ?? ''),
      ordenCompra: String(m['awm_po_code'] ?? ''),
      cliente: String(m['awm_client_name'] ?? ''),
      descripcion: String(m['awm_cargo_description'] ?? ''),
      transporteInland: m['awm_inland_transport'] ? String(m['awm_inland_transport']) : undefined,
      responsable: String(m['awm_responsible_user'] ?? ''),
      fecha: String(m['awm_movement_timestamp'] ?? ''),
      observacion: String(m['awm_notes'] ?? ''),
    };
  }

  static toAuditEntry(a: Record<string, unknown>): AuditEntry {
    return {
      id: String(a['aal_id'] ?? ''),
      timestamp: String(a['aal_event_timestamp'] ?? ''),
      usuario: String(a['aal_actor_name'] ?? ''),
      email: String(a['aal_actor_email'] ?? ''),
      rol: String(a['aal_actor_role'] ?? 'admin') as UserRole,
      categoria: String(a['aal_category'] ?? 'SESION') as AuditCategory,
      entidad: String(a['aal_target_entity'] ?? ''),
      accion: String(a['aal_action_name'] ?? ''),
      detalle: String(a['aal_change_details'] ?? ''),
    };
  }

  static toRoleUser(u: Record<string, unknown>, clientMap: Map<string, string>): RoleUser {
    const cid = u['asu_default_entity_id'] ? String(u['asu_default_entity_id']) : undefined;
    return {
      id: String(u['asu_id'] ?? ''),
      role: String(u['asu_profile_role'] ?? 'operaciones') as UserRole,
      nombre: String(u['asu_full_name'] ?? ''),
      email: String(u['asu_email'] ?? ''),
      password: String(u['asu_password_hash'] ?? ''),
      activo: String(u['asu_status'] ?? 'ACTIVE') === 'ACTIVE',
      cargo: String(u['asu_job_title'] ?? ''),
      clienteId: cid,
      clienteNombre: cid ? clientMap.get(cid) : undefined,
      avatarIcon: String(u['asu_avatar_icon'] ?? 'bi-person-fill'),
      descripcion: String(u['asu_description'] ?? ''),
      ultimoAcceso: u['asu_last_login_at'] ? String(u['asu_last_login_at']).slice(0, 16) : undefined,
      credencialEmitidaEn: u['asu_credential_issued_at']
        ? String(u['asu_credential_issued_at']).slice(0, 16)
        : undefined,
      credencialEmitidaPor: u['asu_credential_issued_by']
        ? String(u['asu_credential_issued_by'])
        : undefined,
    };
  }

  static toRbacMatrix(rows: Record<string, unknown>[]): Record<UserRole, ScreenId[]> {
    const matrix: Partial<Record<UserRole, ScreenId[]>> = {};
    for (const r of rows) {
      if (!r['asr_is_allowed']) continue;
      const role = String(r['asr_role']) as UserRole;
      const screen = String(r['asr_screen_id']) as ScreenId;
      matrix[role] = [...(matrix[role] ?? []), screen];
    }
    return matrix as Record<UserRole, ScreenId[]>;
  }
}
