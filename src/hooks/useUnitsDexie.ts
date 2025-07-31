import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { db, type Unit } from '../services/dexieService';
import { UnitController } from '../api/supabaseApi';

const unitsController = new UnitController();

export const useUnitsDexie = () => {
  const units = useLiveQuery(
    () => db.units
      .orderBy('name')
      .toArray(),
    []
  ) || [];

  useEffect(() => {
    unitsController.getUnits().catch((error: any) => {
      console.error('Background Supabase sync failed:', error);
    });
  }, []);

  const getUnitById = useCallback(async (id: string) => {
    try {
      const unit = await db.units.get(id);
      return unit;
    } catch (err) {
      console.error('Error getting unit by ID:', err);
      throw err;
    }
  }, []);

  return {
    units,
    loading: units === undefined,
    error: null,
    getUnitById,
  };
}; 