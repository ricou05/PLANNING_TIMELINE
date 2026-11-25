import React from 'react';
import { SchoolZone } from '../data/vacancesScolaires';
import { SCHOOL_ZONES, LOCAL_ZONE, getZoneSegments, weekHasSchoolHolidays } from '../utils/calendarInfo';

// Couleurs des zones : la zone B (Nice, celle du magasin) est plus soutenue
const ZONE_STYLES: Record<SchoolZone, { bg: string; text: string }> = {
  A: { bg: '#dbeafe', text: '#1e3a8a' },
  B: { bg: '#fdba74', text: '#7c2d12' },
  C: { bg: '#e9d5ff', text: '#581c87' },
};

interface SchoolHolidayBandProps {
  /** Les 7 dates de la semaine (lundi → dimanche) */
  weekDates: Date[];
  /** Classe de bordure des cellules, pour s'accorder au tableau hôte */
  borderClass: string;
  /** Nombre de colonnes après les jours (colonne Total) */
  trailingColumns?: number;
}

// Texte qui ne fait jamais élargir la colonne (largeur nulle, étiré à 100 %)
const CellText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-hidden whitespace-nowrap text-ellipsis" style={{ width: 0, minWidth: '100%' }}>
    {children}
  </div>
);

/**
 * Bandeau fin des vacances scolaires, une ligne par zone (A, B, C), placé
 * au-dessus de la ligne des jours. Rendu en lignes <tr> à insérer dans <thead>.
 */
const SchoolHolidayBand: React.FC<SchoolHolidayBandProps> = ({ weekDates, borderClass, trailingColumns = 1 }) => {
  const cell = `${borderClass} p-0 px-1 text-[10px] leading-[14px] h-[15px] font-normal`;
  const labelCell = `${cell} sticky left-0 z-10 bg-white text-left text-gray-600`;
  const trailing = trailingColumns > 0 && <th className={`${cell} bg-white`} colSpan={trailingColumns} />;

  if (!weekHasSchoolHolidays(weekDates)) {
    return (
      <tr>
        <th className={labelCell}>
          <CellText>Vacances</CellText>
        </th>
        <th className={`${cell} bg-white text-center italic text-gray-400`} colSpan={weekDates.length}>
          <CellText>Pas de vacances scolaires</CellText>
        </th>
        {trailing}
      </tr>
    );
  }

  return (
    <>
      {SCHOOL_ZONES.map((zone) => {
        const isLocal = zone === LOCAL_ZONE;
        const style = ZONE_STYLES[zone];
        return (
          <tr key={zone}>
            <th
              className={labelCell}
              title={isLocal ? 'Zone B : académie de Nice (zone du magasin)' : `Zone ${zone}`}
            >
              <CellText>
                <span className={isLocal ? 'font-bold' : ''} style={isLocal ? { color: style.text } : undefined}>
                  Zone {zone}
                  {isLocal && ' · Nice'}
                </span>
              </CellText>
            </th>
            {getZoneSegments(weekDates, zone).map((segment) =>
              segment.holiday ? (
                <th
                  key={segment.start}
                  colSpan={segment.span}
                  title={segment.holiday.title}
                  className={`${cell} text-center ${isLocal ? 'font-bold' : ''}`}
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  <CellText>{segment.span > 1 ? segment.holiday.label : segment.holiday.shortLabel}</CellText>
                </th>
              ) : (
                <th key={segment.start} className={`${cell} bg-white`} />
              )
            )}
            {trailing}
          </tr>
        );
      })}
    </>
  );
};

export default SchoolHolidayBand;
