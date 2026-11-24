import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { arlogsContextInterceptor } from './infrastructure/http/arlogs-context.interceptor';
import { SPREADSHEET_EXPORTER_PORT } from './domain/ports/spreadsheet-exporter.port';
import { XlsxSpreadsheetExporterAdapter } from './infrastructure/exporters/xlsx-spreadsheet-exporter.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([arlogsContextInterceptor])),
    {
      provide: SPREADSHEET_EXPORTER_PORT,
      useExisting: XlsxSpreadsheetExporterAdapter,
    },
  ],
};
