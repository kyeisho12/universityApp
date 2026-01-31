import { supabase } from '../lib/supabaseClient'

export interface Employer {
  id?: string;
  name: string;
  website?: string;
  industry: string;
  contact_email: string;
  phone?: string;
  address?: string;
  description?: string;
  logo_url?: string;
  verified?: boolean;
  job_listings_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployerStats {
  total_partners: number;
  verified: number;
  pending: number;
  active_listings: number;
}

class EmployerService {
  /**
   * Get all employers
   */
  static async getAll(includeUnverified = false): Promise<Employer[]> {
    try {
      let query = supabase.from('employers').select('*').order('created_at', { ascending: false })
      
      // Filter to only verified employers unless explicitly requested
      if (!includeUnverified) {
        query = query.eq('verified', true)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching employers:", error);
      throw error;
    }
  }

  /**
   * Get a specific employer by ID
   */
  static async getById(employerId: string): Promise<Employer> {
    try {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('id', employerId)
        .single()
      
      if (error) throw error
      if (!data) throw new Error('Employer not found')
      
      return data
    } catch (error) {
      console.error("Error fetching employer:", error);
      throw error;
    }
  }

  /**
   * Create a new employer
   */
  static async create(employer: Employer): Promise<Employer> {
    try {
      const { data, error } = await supabase
        .from('employers')
        .insert({
          name: employer.name,
          website: employer.website || null,
          industry: employer.industry,
          contact_email: employer.contact_email,
          phone: employer.phone || null,
          address: employer.address || null,
          description: employer.description || null,
          logo_url: employer.logo_url || null,
          verified: false, // New employers start as unverified
          job_listings_count: 0
        })
        .select()
        .single()
      
      if (error) throw error
      if (!data) throw new Error('Failed to create employer')
      
      return data
    } catch (error) {
      console.error("Error creating employer:", error);
      throw error;
    }
  }

  /**
   * Update an existing employer
   */
  static async update(employerId: string, updates: Partial<Employer>): Promise<Employer> {
    try {
      const { data, error } = await supabase
        .from('employers')
        .update(updates)
        .eq('id', employerId)
        .select()
        .single()
      
      if (error) throw error
      if (!data) throw new Error('Failed to update employer')
      
      return data
    } catch (error) {
      console.error("Error updating employer:", error);
      throw error;
    }
  }

  /**
   * Delete an employer
   */
  static async delete(employerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employers')
        .delete()
        .eq('id', employerId)
      
      if (error) throw error
    } catch (error) {
      console.error("Error deleting employer:", error);
      throw error;
    }
  }

  /**
   * Search employers
   */
  static async search(query: string, includeUnverified = false): Promise<Employer[]> {
    try {
      let supabaseQuery = supabase
        .from('employers')
        .select('*')
        .or(`name.ilike.%${query}%,industry.ilike.%${query}%`)
      
      if (!includeUnverified) {
        supabaseQuery = supabaseQuery.eq('verified', true)
      }
      
      const { data, error } = await supabaseQuery
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error searching employers:", error);
      throw error;
    }
  }

  /**
   * Verify an employer (admin only)
   */
  static async verify(employerId: string): Promise<Employer> {
    try {
      return await this.update(employerId, { verified: true })
    } catch (error) {
      console.error("Error verifying employer:", error);
      throw error;
    }
  }

  /**
   * Get employer statistics
   */
  static async getStats(): Promise<EmployerStats> {
    try {
      const { data, error } = await supabase
        .from('employers')
        .select('verified, job_listings_count')
      
      if (error) throw error
      
      const employers = data || []
      const stats: EmployerStats = {
        total_partners: employers.length,
        verified: employers.filter(e => e.verified).length,
        pending: employers.filter(e => !e.verified).length,
        active_listings: employers.reduce((sum, e) => sum + (e.job_listings_count || 0), 0)
      }
      
      return stats
    } catch (error) {
      console.error("Error fetching employer stats:", error);
      throw error;
    }
  }
}

export default EmployerService;
