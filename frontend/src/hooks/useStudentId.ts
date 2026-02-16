import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook to fetch and cache student ID from profiles table
 * Reduces duplicate code across pages
 */
export function useStudentId(userId: string | undefined): string {
  const [studentId, setStudentId] = useState<string>('2024-00001');

  useEffect(() => {
    if (!userId) return;

    const fetchStudentId = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('student_id')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setStudentId(data?.student_id || '2024-00001');
      } catch (err) {
        console.error('Failed to fetch student_id:', err);
      }
    };

    fetchStudentId();
  }, [userId]);

  return studentId;
}
