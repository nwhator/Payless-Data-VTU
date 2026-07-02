export const getTitle = (key: string) => {
  switch (key) {
    case "overview":
      return "Overview"
    case "store":
      return "My Store"
    case "wallet":
      return "My Wallet"
    case "purchases":
      return "Data Purchases"
    case "pricing":
      return "Prices & Profit"
    case "commissions":
      return "Commissions"
    case "reports":
      return "Sales Stats"
    case "profile":
      return "Profile Settings"
    case "support":
      return "Support Center"
    case "logout":
      return "Logout"
    default:
      return "Agent Dashboard"
  }
}
