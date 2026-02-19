import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook to fetch and cache student ID from profiles table
 * Reduces duplicate code across pages
 */
export function useStudentId(userId: string | undefined): string {
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    if (!userId) {
      setStudentId('');
      return;
    }

    const fetchStudentId = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('student_number')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          const missingColumn = error.message?.toLowerCase().includes('student_number');

          if (!missingColumn) throw error;

          const { data: legacyData, error: legacyError } = await supabase
            .from('profiles')
            .select('student_id')
            .eq('id', userId)
            .maybeSingle();

          if (legacyError) throw legacyError;

          const legacyId = (legacyData as { student_id?: string | number } | null)?.student_id;
          setStudentId(legacyId != null ? String(legacyId) : '2024-00001');
          return;
        }

        const resolvedId = (data as { student_number?: string | number } | null)?.student_number;
        setStudentId(resolvedId != null ? String(resolvedId) : '2024-00001');
      } catch (err) {
        console.error('Failed to fetch student number:', err);
        setStudentId('2024-00001');
      }
    };

    fetchStudentId();
  }, [userId]);

  return studentId;
}
