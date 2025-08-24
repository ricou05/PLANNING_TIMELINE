import { ColorLabel } from '../../types';
import { cookieStorage } from './cookieStorage';

const COLOR_LABELS_KEY = 'colorLabels';

export const colorLabelStorage = {
  save: (labels: ColorLabel[]): void => {
    cookieStorage.set(COLOR_LABELS_KEY, labels);
  },

  load: (): ColorLabel[] => {
    return cookieStorage.get(COLOR_LABELS_KEY) || [];
  },

  update: (label: ColorLabel): ColorLabel[] => {
    const labels = colorLabelStorage.load();
    const index = labels.findIndex(l => l.color === label.color);
    
    if (index >= 0) {
      labels[index] = label;
    } else {
      labels.push(label);
    }
    
    colorLabelStorage.save(labels);
    return labels;
  }
};