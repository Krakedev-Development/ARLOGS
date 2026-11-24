import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ShipmentService } from '../../services/shipment.service';
import { NETWORK_CONFIG } from '../../core/config/api-endpoints.config';
import { ArlogsRemoteSyncAdapter } from './arlogs-remote-sync.adapter';

export const arlogsContextInterceptor: HttpInterceptorFn = (req, next) => {
  const shipmentService = inject(ShipmentService);
  const remoteSync = inject(ArlogsRemoteSyncAdapter);
  const currentUser = shipmentService.currentUser();
  const token = remoteSync.accessToken();

  const headers: Record<string, string> = {
    'X-Arlogs-Client-Host': NETWORK_CONFIG.host,
    'X-Arlogs-User-Role': currentUser.role,
    'X-Arlogs-User-Id': currentUser.id,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (currentUser.clienteId) {
    headers['X-Arlogs-Tenant-Id'] = currentUser.clienteId;
  }

  const clonedRequest = req.clone({
    setHeaders: headers,
    withCredentials: true,
  });

  return next(clonedRequest);
};
