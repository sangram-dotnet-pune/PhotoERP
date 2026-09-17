import { invoke } from '@tauri-apps/api/core';

import type { QuotationDto } from '../types/database';
import { QuotationListItem } from '../features/quotations/types/quotationList.types';

class QuotationService {
  /**
   * Save a new quotation
   */
  async saveQuotation(
    quotation: QuotationDto,
  ): Promise<string> {
    return await invoke('save_quotation', {
      quotation,
    });
  }

  /**
   * Get all quotations
   */
async getQuotations() {
  return invoke<QuotationListItem[]>(
    'get_quotations'
  );
}

/**
 * All future events, nearest first.
 */
async getUpcomingEvents() {
  return invoke<QuotationListItem[]>(
    'get_upcoming_events'
  );
}

/**
 * Quotations with a remaining balance, largest balance first.
 */
async getPendingQuotations() {
  return invoke<QuotationListItem[]>(
    'get_pending_quotations'
  );
}

  /**
   * Get quotation by ID
   */
async getQuotation(id: number) {
  return invoke<QuotationDto>(
    'get_quotation_by_id',
    { id }
  );
}

  /**
   * Update quotation
   */
 async updateQuotation(data: QuotationDto) {
  return invoke(
    'update_quotation',
    { quotation: data }
  );
}

  /**
   * Delete a quotation. Payments and services are removed with it; the
   * client record is kept (clients are independent of quotations).
   */
async deleteQuotation(id: number): Promise<void> {
  return invoke(
    'delete_quotation',
    { id }
  );
}

  /**
   * Generate next quotation number
   */
  async generateQuotationNumber(): Promise<string> {
    return await invoke('generate_quotation_number');
  }

  /**
   * Update the workflow status of a quotation
   */
  async updateStatus(id: number, status: string) {
    return invoke('update_quotation_status', {
      id,
      status,
    });
  }
}

export const quotationService = new QuotationService();