import { useState, useEffect } from 'react';
import { ColorLabel } from '../types';
import { colorLabelStorage } from '../utils/storage/colorLabelStorage';

export const useColorLabels = () => {
  const [colorLabels, setColorLabels] = useState<ColorLabel[]>([]);

  useEffect(() => {
    const savedLabels = colorLabelStorage.load();
    setColorLabels(savedLabels);
  }, []);

  const updateColorLabel = (label: ColorLabel) => {
    const updatedLabels = colorLabelStorage.update(label);
    setColorLabels(updatedLabels);
  };

  return {
    colorLabels,
    updateColorLabel
  };
};