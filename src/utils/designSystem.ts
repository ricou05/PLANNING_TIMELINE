/**
 * Design System - Professional Color Palette & Component Styles
 * Single source of truth for all UI styling across the application
 */

export const colors = {
  // Primary - Professional Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Success - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Danger - Red
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral - Gray
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

/**
 * Standardized component classes
 */
export const components = {
  // Button variants
  button: {
    primary: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    secondary: 'px-4 py-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    success: 'px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
    danger: 'px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    ghost: 'px-4 py-2 bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
    small: 'px-3 py-1.5 text-sm',
    large: 'px-6 py-3 text-base',
  },

  // Input fields
  input: {
    base: 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    error: 'border-red-300 focus:ring-red-500 focus:border-red-500',
    disabled: 'bg-gray-100 text-gray-500 cursor-not-allowed',
    small: 'px-2 py-1 text-xs',
  },

  // Cards & Containers
  card: {
    base: 'bg-white rounded-lg border border-gray-200 shadow-sm',
    padded: 'p-6',
    hover: 'hover:shadow-md transition-shadow duration-200',
  },

  // Tab navigation
  tab: {
    base: 'px-4 py-2 font-medium text-sm rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    active: 'bg-blue-600 text-white shadow-sm',
    inactive: 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300',
  },

  // Badge/Label
  badge: {
    base: 'px-2 py-1 text-xs font-medium rounded-md',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800',
  },
};

/**
 * Spacing scale (based on 4px grid)
 */
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
};

/**
 * Animation utilities
 */
export const animations = {
  fadeIn: 'animate-fadeIn',
  slideIn: 'animate-slideIn',
  scaleIn: 'animate-scaleIn',
};
