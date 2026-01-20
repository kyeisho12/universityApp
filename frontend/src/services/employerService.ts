const API_BASE_URL = "http://localhost:5000/api/employers/";

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
      const url = `${API_BASE_URL}?include_unverified=${includeUnverified}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employers: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || [];
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
      const response = await fetch(`${API_BASE_URL}/${employerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employer: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
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
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employer),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create employer: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
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
      const response = await fetch(`${API_BASE_URL}/${employerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update employer: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
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
      const response = await fetch(`${API_BASE_URL}/${employerId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete employer: ${response.statusText}`);
      }
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
      const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&include_unverified=${includeUnverified}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to search employers: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || [];
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
      const response = await fetch(`${API_BASE_URL}/${employerId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to verify employer: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
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
      const response = await fetch(`${API_BASE_URL}/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employer stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error fetching employer stats:", error);
      throw error;
    }
  }
}

export default EmployerService;
