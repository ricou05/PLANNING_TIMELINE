// Point d'entrée des exports PDF/PNG des vues semaine (Vue 1 grille, Vue 2
// visuelle, vue classique). Le code de chaque vue est dans utils/pdf/.
import { ExportToPDFParams, renderAndSave } from './pdf/shared';
import { createPDFTable } from './pdf/classicTable';
import { createGridPDFTable } from './pdf/gridTable';
import { createVisualPDFTable } from './pdf/visualTable';

export type { PDFExportOptions, ExportDisplaySettings } from './pdf/shared';
export { saveCanvasAsPNG } from './pdf/shared';

export const exportToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createPDFTable(params),
      `planning-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};

export const exportGridToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createGridPDFTable(params),
      `planning-vue1-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};

export const exportVisualToPDF = async (params: ExportToPDFParams): Promise<void> => {
  try {
    await renderAndSave(
      createVisualPDFTable(params),
      `planning-vue2-semaine-${params.weekNumber}-${params.year}`,
      params.options?.format || 'pdf',
    );
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    throw error;
  }
};
