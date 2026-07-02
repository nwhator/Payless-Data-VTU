import { InertiaLinkProps } from "@inertiajs/react"
import { LucideIcon } from "lucide-react"
import type { User } from "./user" // ✅ your existing User interface

// 🧩 Product interface
export interface Product {
  product_code: string
  name: string
  capacity: string
  validity: string
  price: number
  currency: string
  status: "active" | "inactive"
}

// 🧩 Auth interface
export interface Auth {
  user: User | null
}

export interface BreadcrumbItem {
  title: string
  href: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface NavItem {
  title: string
  href: NonNullable<InertiaLinkProps["href"]>
  icon?: LucideIcon | null
  isActive?: boolean
}

// ✅ SharedData (Laravel → Inertia global props)
export interface SharedData {
  auth: Auth
  sidebarOpen?: boolean
  name?: string
  quote?: { message: string; author: string }
  products?: Product[]
  [key: string]: unknown
}
