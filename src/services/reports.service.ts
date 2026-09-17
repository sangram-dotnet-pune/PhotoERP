import { invoke } from '@tauri-apps/api/core';

import type {
  PaymentRecord,
  PendingClient,
  ReportsSummary,
  TopClient,
} from '../features/reports/types/reports.types';

class ReportsService {
  async getReportsSummary(): Promise<ReportsSummary> {
    return invoke<ReportsSummary>('get_reports_summary');
  }

  async getTopClients(limit?: number): Promise<TopClient[]> {
    return invoke<TopClient[]>('get_top_clients', {
      limit: limit ?? 10,
    });
  }

  async getPendingClients(): Promise<PendingClient[]> {
    return invoke<PendingClient[]>('get_pending_clients');
  }

  async getAllPayments(
    from?: string,
    to?: string,
  ): Promise<PaymentRecord[]> {
    return invoke<PaymentRecord[]>('get_all_payments', {
      from: from || null,
      to: to || null,
    });
  }
}

export const reportsService = new ReportsService();