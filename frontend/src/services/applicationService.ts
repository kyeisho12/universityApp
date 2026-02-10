import { supabase } from "../lib/supabaseClient";

export interface Application {
  id: string;
  student_id: string;
  job_id: string;
  employer_id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  cover_letter?: string;
  resume_id?: string;
  application_date: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function submitJobApplication(
  studentId: string,
  jobId: string,
  employerId: string,
  coverLetter?: string,
  resumeId?: string
): Promise<{ success: boolean; data?: Application; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          student_id: studentId,
          job_id: jobId,
          employer_id: employerId,
          status: "pending",
          cover_letter: coverLetter,
          resume_id: resumeId,
          application_date: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function checkIfApplied(
  studentId: string,
  jobId: string
): Promise<{ hasApplied: boolean; application?: Application }> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .neq("status", "withdrawn")
      .single();

    if (error && error.code === "PGRST116") {
      // No rows returned
      return { hasApplied: false };
    }

    if (error) {
      console.error("Error checking application:", error);
      return { hasApplied: false };
    }

    return { hasApplied: true, application: data };
  } catch (err) {
    console.error("Error checking if applied:", err);
    return { hasApplied: false };
  }
}

export async function getStudentApplications(
  studentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Application[]> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", studentId)
      .order("application_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error in getStudentApplications:", err);
    return [];
  }
}

export async function getJobApplications(
  jobId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Application[]> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("job_id", jobId)
      .order("application_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching job applications:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error in getJobApplications:", err);
    return [];
  }
}

export async function getAllApplications(
  status?: string,
  employerId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Application[]> {
  try {
    let query = supabase
      .from("applications")
      .select("*")
      .order("application_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (employerId) {
      query = query.eq("employer_id", employerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error in getAllApplications:", err);
    return [];
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "pending" | "accepted" | "rejected" | "withdrawn",
  notes?: string,
  reviewedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("applications")
      .update({
        status,
        notes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function withdrawApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("applications")
      .update({
        status: "withdrawn",
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getApplicationStats(): Promise<{
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}> {
  try {
    const [totalRes, pendingRes, acceptedRes, rejectedRes] = await Promise.all([
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted"),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
    ]);

    return {
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      accepted: acceptedRes.count || 0,
      rejected: rejectedRes.count || 0,
    };
  } catch (err) {
    console.error("Error getting application stats:", err);
    return { total: 0, pending: 0, accepted: 0, rejected: 0 };
  }
}
