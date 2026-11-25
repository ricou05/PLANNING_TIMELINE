// Éléments communs aux exports PDF/PNG des vues semaine : types, gabarit A4,
// utilitaires de cellules et rendu html2canvas → PDF/PNG.
// Chaque vue est reconstruite en DOM dans son propre fichier (classicTable,
// gridTable, visualTable) ; le point d'entrée public reste utils/pdfExport.ts.
import type { Employee, Schedule, ManagedColor } from '../../types';
import { findManagedColor, getTextColorForHex } from '../colorUtils';

export interface PDFExportOptions {
  showTotalColumn: boolean;
  /** 'pdf' (défaut) pour impression, 'png' pour partage (WhatsApp, e-mail…) */
  format?: 'pdf' | 'png';
  /**
   * true : les lignes s'étirent pour occuper toute la hauteur de la page A4
   * (ancien comportement). false (défaut) : hauteur de ligne plafonnée à celle
   * de l'écran, le tableau garde les proportions de la vue en ligne.
   */
  fillPage?: boolean;
}

// Réglages d'affichage en cours (menu Paramètres) à reporter sur l'export
export interface ExportDisplaySettings {
  /** Taille de la police du tableau, en % (100 = normal) */
  fontScale?: number;
  /** Épaisseur des traits du tableau, en px */
  borderWidth?: number;
}

export interface ExportToPDFParams {
  employees: Employee[];
  days: string[];
  dates: string[];
  schedules: Record<string, Schedule>;
  weekNumber: number;
  year: number;
  managedColors: ManagedColor[];
  options?: PDFExportOptions;
  display?: ExportDisplaySettings;
}

// A4 landscape dimensions at 96dpi
export const A4_W = 1122;
export const A4_H = 793;
export const PAD_H = 20;
export const PAD_V = 16;
export const TITLE_H = 35;
export const LEGEND_H = 32;

// Fixed column widths matching web proportions
export const COL_EMPLOYEE = 100;
export const COL_PERIOD = 42;
export const COL_TOTAL = 56;

// Hauteurs de ligne maximales (px), alignées sur la vue en ligne
export const MAX_ROW_H_GRID = 54;    // vue 1 grille : min-h 52 px à l'écran
export const MAX_ROW_H_VISUAL = 54;  // vue 2 : min-h 48 px + marges
export const MAX_ROW_H_CLASSIC = 32; // vue classique : 64 px pour 2 demi-lignes

// Hauteur de ligne : la place disponible sur une page A4 répartie entre les
// lignes, plafonnée à la hauteur écran sauf si l'on veut remplir la page.
// Avec beaucoup d'employés, les lignes rétrécissent pour tenir sur une page.
export const computeRowH = (
  availH: number,
  numRows: number,
  maxRowH: number,
  fillPage: boolean,
): number => {
  const fitH = Math.floor(availH / numRows);
  return fillPage ? fitH : Math.min(maxRowH, fitH);
};

// Conteneur de rendu : largeur A4 fixe (même échelle quel que soit le contenu) ;
// hauteur A4 imposée seulement en mode « remplir la page », sinon la hauteur
// suit le contenu (PNG rogné, pas de blanc inutile).
export const createContainer = (fillPage: boolean): HTMLElement => {
  const container = document.createElement('div');
  container.style.cssText = `padding:${PAD_V}px ${PAD_H}px;background:#fff;width:${A4_W}px;${fillPage ? `min-height:${A4_H}px;` : ''}font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;`;
  return container;
};

export const getColorHex = (managedColors: ManagedColor[], colorName?: string): string | null => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? mc.hex : null;
};

export const getTextColor = (managedColors: ManagedColor[], colorName?: string): string => {
  const mc = findManagedColor(managedColors, colorName);
  return mc ? getTextColorForHex(mc.hex) : '#000000';
};

export const buildLegend = (managedColors: ManagedColor[]): HTMLElement => {
  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:9px;';
  managedColors.forEach(mc => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:4px;';
    const swatch = document.createElement('span');
    swatch.style.cssText = `width:10px;height:10px;border-radius:50%;border:1px solid #d1d5db;display:inline-block;background:${mc.hex};`;
    item.appendChild(swatch);
    const label = document.createElement('span');
    label.style.color = '#374151';
    label.textContent = mc.label;
    item.appendChild(label);
    legend.appendChild(item);
  });
  return legend;
};

export const REST_DAY_BG = `repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 6px)`;
// ─── Fonction générique d'export ──────────────────────────────────────────────

// Rendu du tableau HTML en canvas haute résolution (scale 3 ≈ 300 dpi sur A4)
export const renderToCanvas = async (container: HTMLElement): Promise<HTMLCanvasElement> => {
  // Chargée à la demande : html2canvas ne pèse pas sur le chargement initial
  const { default: html2canvas } = await import('html2canvas');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    return await html2canvas(container, {
      scale: 3,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  } finally {
    document.body.removeChild(container);
  }
};

export const saveCanvasAsPDF = async (canvas: HTMLCanvasElement, filename: string): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();   // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;
  const marginY = 6;
  const usableWidth = pageWidth - marginX * 2;
  const usableHeight = pageHeight - marginY * 2;
  const ratio = canvas.width / canvas.height;

  let imgWidth = usableWidth;
  let imgHeight = imgWidth / ratio;

  if (imgHeight > usableHeight) {
    imgHeight = usableHeight;
    imgWidth = imgHeight * ratio;
  }

  // Centré horizontalement, calé en haut de page (comme un document imprimé)
  const x = (pageWidth - imgWidth) / 2;
  const y = marginY;

  // PNG sans perte : texte net sur les aplats de couleur. La compression 'SLOW'
  // (flate) est indispensable : sans elle jsPDF intègre l'image non compressée
  // et le fichier dépasse 30 Mo.
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight, undefined, 'SLOW');
  pdf.save(filename);
};

export const saveCanvasAsPNG = (canvas: HTMLCanvasElement, filename: string): Promise<void> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Génération PNG impossible'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });

// Exporte le tableau en PDF ou en image PNG selon options.format
export const renderAndSave = async (
  container: HTMLElement,
  baseFilename: string,
  format: 'pdf' | 'png',
): Promise<void> => {
  const canvas = await renderToCanvas(container);
  if (format === 'png') {
    await saveCanvasAsPNG(canvas, `${baseFilename}.png`);
  } else {
    await saveCanvasAsPDF(canvas, `${baseFilename}.pdf`);
  }
};
