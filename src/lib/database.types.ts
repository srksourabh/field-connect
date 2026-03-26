export type Database = {
  public: {
    Tables: {
      hr_profiles: {
        Row: {
          id: string;
          full_name: string;
          designation: string | null;
          reporting_manager_id: string | null;
          project_id: string | null;
          department: string | null;
          role: "employee" | "manager" | "admin" | "super_admin";
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          date_of_joining: string | null;
          employee_code: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          deactivated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          designation?: string | null;
          reporting_manager_id?: string | null;
          project_id?: string | null;
          department?: string | null;
          role?: "employee" | "manager" | "admin" | "super_admin";
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          date_of_joining?: string | null;
          employee_code?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["hr_profiles"]["Insert"]>;
      };
      hr_attendance: {
        Row: {
          id: string;
          user_id: string;
          punch_in_at: string | null;
          punch_out_at: string | null;
          punch_in_lat: number | null;
          punch_in_long: number | null;
          punch_out_lat: number | null;
          punch_out_long: number | null;
          total_distance_km: number | null;
          status: "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";
          synced: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          punch_in_at?: string | null;
          punch_out_at?: string | null;
          punch_in_lat?: number | null;
          punch_in_long?: number | null;
          punch_out_lat?: number | null;
          punch_out_long?: number | null;
          total_distance_km?: number | null;
          status?: "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";
          synced?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["hr_attendance"]["Insert"]>;
      };
      hr_leave_balances: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          sick_leave_total: number;
          sick_leave_used: number;
          casual_leave_total: number;
          casual_leave_used: number;
          compoff_total: number;
          compoff_used: number;
          privilege_leave_total: number;
          privilege_leave_used: number;
          wfh_total: number;
          wfh_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          sick_leave_total?: number;
          sick_leave_used?: number;
          casual_leave_total?: number;
          casual_leave_used?: number;
          compoff_total?: number;
          compoff_used?: number;
          privilege_leave_total?: number;
          privilege_leave_used?: number;
          wfh_total?: number;
          wfh_used?: number;
        };
        Update: Partial<Database["public"]["Tables"]["hr_leave_balances"]["Insert"]>;
      };
      hr_leave_requests: {
        Row: {
          id: string;
          user_id: string;
          type: "sick" | "casual" | "compoff" | "privilege" | "wfh";
          start_date: string;
          end_date: string;
          reason: string | null;
          attachment_url: string | null;
          status: "pending" | "approved" | "rejected" | "withdrawn";
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "sick" | "casual" | "compoff" | "privilege" | "wfh";
          start_date: string;
          end_date: string;
          reason?: string | null;
          attachment_url?: string | null;
          status?: "pending" | "approved" | "rejected" | "withdrawn";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_comment?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["hr_leave_requests"]["Insert"]>;
      };
      hr_location_logs: {
        Row: {
          id: string;
          user_id: string;
          attendance_id: string | null;
          lat: number;
          long: number;
          captured_at: string;
          source: "punch_in" | "punch_out" | "scheduled" | "manual";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          attendance_id?: string | null;
          lat: number;
          long: number;
          captured_at?: string;
          source: "punch_in" | "punch_out" | "scheduled" | "manual";
        };
        Update: Partial<Database["public"]["Tables"]["hr_location_logs"]["Insert"]>;
      };
      hr_rectification_requests: {
        Row: {
          id: string;
          user_id: string;
          attendance_date: string;
          attendance_id: string | null;
          rectification_type: "missed_punch_in" | "missed_punch_out" | "wrong_time" | "other";
          original_punch_in: string | null;
          original_punch_out: string | null;
          corrected_punch_in: string | null;
          corrected_punch_out: string | null;
          corrected_status: "present" | "late" | "half-day" | null;
          reason: string;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          attendance_date: string;
          attendance_id?: string | null;
          rectification_type: "missed_punch_in" | "missed_punch_out" | "wrong_time" | "other";
          original_punch_in?: string | null;
          original_punch_out?: string | null;
          corrected_punch_in?: string | null;
          corrected_punch_out?: string | null;
          corrected_status?: "present" | "late" | "half-day" | null;
          reason: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_comment?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["hr_rectification_requests"]["Insert"]>;
      };
    };
  };
};

export type HrProfile = Database["public"]["Tables"]["hr_profiles"]["Row"];
export type HrAttendance = Database["public"]["Tables"]["hr_attendance"]["Row"];
export type HrLeaveBalance = Database["public"]["Tables"]["hr_leave_balances"]["Row"];
export type HrLeaveRequest = Database["public"]["Tables"]["hr_leave_requests"]["Row"];
export type HrLocationLog = Database["public"]["Tables"]["hr_location_logs"]["Row"];
export type HrRectificationRequest = Database["public"]["Tables"]["hr_rectification_requests"]["Row"];

export interface HrNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface HrConfig {
  id: string;
  key: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface HrMasterData {
  id: string;
  type: "project" | "department" | "designation";
  name: string;
  external_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HrLeavePolicy {
  id: string;
  name: string;
  sick_leave_count: number;
  casual_leave_count: number;
  privilege_leave_count: number;
  is_active: boolean;
  created_at: string;
}

export interface HrMessage {
  id: string;
  sender_id: string;
  category: "complaint" | "suggestion" | "feedback" | "other";
  subject: string;
  message: string;
  is_anonymous: boolean;
  is_read: boolean;
  created_at: string;
}
