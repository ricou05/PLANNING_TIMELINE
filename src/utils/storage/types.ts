export interface StorageOptions {
  expires?: number; // Durée en jours
  prefix?: string;
}

export interface StorageProvider {
  get: (key: string) => unknown;
  set: (key: string, value: unknown, options?: StorageOptions) => void;
  remove: (key: string) => void;
}
