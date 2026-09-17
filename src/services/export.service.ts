import { invoke } from '@tauri-apps/api/core';

export type ExportKind =
  | 'quotations'
  | 'clients'
  | 'payments'
  | 'services';

class ExportService {
  /**
   * Export a table to a CSV file. `outputPath` is the full destination path.
   * Returns the path the file was written to.
   */
  async exportCsv(
    kind: ExportKind,
    outputPath: string,
  ): Promise<string> {
    return invoke<string>('export_csv', {
      kind,
      outputPath,
    });
  }
}

export const exportService = new ExportService();