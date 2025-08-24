export interface StorageOptions {
  expires?: number; // Durée en jours
  prefix?: string;
}

export interface StorageProvider {
  get: (key: string) => any;
  set: (key: string, value: any, options?: StorageOptions) => void;
  remove: (key: string) => void;
}