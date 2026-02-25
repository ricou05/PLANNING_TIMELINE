import Cookies from 'js-cookie';
import { StorageProvider, StorageOptions } from './types';

export const cookieStorage: StorageProvider = {
  get: (key: string) => {
    try {
      const value = Cookies.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error reading cookie ${key}:`, error);
      return null;
    }
  },

  set: (key: string, value: unknown, options?: StorageOptions) => {
    try {
      Cookies.set(key, JSON.stringify(value), {
        expires: options?.expires || 365
      });
    } catch (error) {
      console.error(`Error setting cookie ${key}:`, error);
    }
  },

  remove: (key: string) => {
    Cookies.remove(key);
  }
};
