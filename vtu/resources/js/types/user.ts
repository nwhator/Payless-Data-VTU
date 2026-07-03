export interface UserProfile {
  bio?: string;
  phone?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role: "customer" | "agent" | "admin";
  profile?: UserProfile | null;
  email_verified_at: string | null;
  two_factor_enabled?: boolean;
  agent_slug?: string | null;
  created_at?: string;
  updated_at?: string;
}
