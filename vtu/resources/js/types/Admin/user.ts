export interface AppUser {
  id: string
  name: string
  email: string
  role: 'customer' | 'agent' | 'admin' | 'suspended'
  balance: number
  commission_earned: number
  is_pending_agent: boolean
  last_login: string
}
