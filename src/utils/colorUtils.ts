export interface ColorOption {
  name: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { 
    name: 'Jaune',
    bgClass: 'bg-[#F4C300]',
    borderClass: 'border-[#F4C300]',
    textClass: 'text-black'
  },
  { 
    name: 'Rouge',
    bgClass: 'bg-[#CC0605]',
    borderClass: 'border-[#CC0605]',
    textClass: 'text-white'
  },
  { 
    name: 'Bleu',
    bgClass: 'bg-[#063971]',
    borderClass: 'border-[#063971]',
    textClass: 'text-white'
  },
  { 
    name: 'Vert',
    bgClass: 'bg-[#317F43]',
    borderClass: 'border-[#317F43]',
    textClass: 'text-white'
  },
  { 
    name: 'Bleu Ciel',
    bgClass: 'bg-[#87CEEB]',
    borderClass: 'border-[#87CEEB]',
    textClass: 'text-black'
  },
  { 
    name: 'Orange',
    bgClass: 'bg-[#FF7F00]',
    borderClass: 'border-[#FF7F00]',
    textClass: 'text-white'
  },
  { 
    name: 'Violet',
    bgClass: 'bg-[#A03472]',
    borderClass: 'border-[#A03472]',
    textClass: 'text-white'
  }
];

export const getColorClasses = (color?: string): string => {
  if (!color) return '';
  const colorOption = COLOR_OPTIONS.find(c => c.name.toLowerCase() === color.toLowerCase());
  return colorOption ? `${colorOption.bgClass} ${colorOption.borderClass} ${colorOption.textClass}` : '';
};
