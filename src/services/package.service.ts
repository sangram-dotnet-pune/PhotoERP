import { invoke } from '@tauri-apps/api/core';

import type {
  CatalogService,
  ReusablePackage,
} from '../types/package';

class PackageService {
  async getPackages(): Promise<ReusablePackage[]> {
    return invoke<ReusablePackage[]>('get_packages');
  }

  async savePackage(pkg: ReusablePackage): Promise<void> {
    return invoke<void>('save_package', { package: pkg });
  }

  async deletePackage(id: number): Promise<void> {
    return invoke<void>('delete_package', { id });
  }

  async getCatalogServices(): Promise<CatalogService[]> {
    return invoke<CatalogService[]>('get_catalog_services');
  }

  async saveCatalogService(service: CatalogService): Promise<void> {
    return invoke<void>('save_catalog_service', { service });
  }

  async deleteCatalogService(id: number): Promise<void> {
    return invoke<void>('delete_catalog_service', { id });
  }
}

export const packageService = new PackageService();