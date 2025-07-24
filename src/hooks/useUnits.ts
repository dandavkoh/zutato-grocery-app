import { useState, useEffect, useCallback } from 'react';
import { UnitController } from '../api/supabaseApi';
import type { Unit } from '../api/supabaseApi';

const unitController = new UnitController();

export const useUnits = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load units
  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await unitController.getUnits();
      if (response.error) {
        setError(response.error);
      } else {
        setUnits(response.data || []);
      }
    } catch (err) {
      setError('Failed to load units');
      console.error('Error loading units:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load units on mount
  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Get unit by ID
  const getUnitById = useCallback(async (id: string) => {
    try {
      const response = await unitController.getUnitById(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error getting unit by ID:', err);
      throw err;
    }
  }, []);

  return {
    units,
    loading,
    error,
    loadUnits,
    getUnitById,
  };
}; 