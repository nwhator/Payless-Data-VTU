import { Product } from "../../types/Admin/product"
import { MarginSetting } from "../../types/Admin/margin"

export const calculatePrices = (product: Product, margins: MarginSetting) => {
  // ✅ safer and more idiomatic check
  const hasCustom = product.product_code in (margins.custom_margins || {})

  const markup = hasCustom
    ? margins.custom_margins[product.product_code]
    : margins.global_markup_ghs

  const customerPrice = product.wholesale_price + markup
  const discountAmount = customerPrice * (margins.agent_discount_pct / 100)
  const agentPrice = customerPrice - discountAmount

  return {
    customerPrice: parseFloat(customerPrice.toFixed(2)),
    agentPrice: parseFloat(agentPrice.toFixed(2)),
    profitMargin: parseFloat(markup.toFixed(2)),
    isCustom: hasCustom,
  }
}

export const getTitle = (key: string) => {
  switch (key) {
    case "dashboard":
      return "Dashboard"
    case "users":
      return "Users Management"
    case "requests":
      return "Agent Requests"
    case "wallets":
      return "Withdrawal Requests"
    case "pricing":
      return "Prices & Profit"
    case "transactions":
      return "Transactions"
    case "api":
      return "API & System"
    case "purchase":
      return "Purchase Data"
    case "settings":
      return "Settings"
    case "reports":
      return "Reports & Analytics"
    case "notifications":
      return "Send Notification to Agents" // ✅ new case
    default:
      return "Admin Dashboard"
  }
}


