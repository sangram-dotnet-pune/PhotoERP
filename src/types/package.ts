export interface PackageService {
  id?: number;
  service_name: string;
  quantity: number;
  price: number;
}

export interface ReusablePackage {
  id?: number;
  name: string;
  services: PackageService[];
}

export interface CatalogService {
  id?: number;
  name: string;
  price: number;
}