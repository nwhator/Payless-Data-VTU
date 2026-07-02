import React from "react"
import axios from "axios"
import { toast } from "sonner"

interface FundWalletButtonProps {
  email: string
  amount: number
}

const FundWalletButton: React.FC<FundWalletButtonProps> = ({ email, amount }) => {
  const handleFund = async () => {
    try {
      const { data } = await axios.post("/paystack/initialize", { email, amount })
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url
      } else {
        toast.error("Unable to initialize payment")
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Payment initialization failed")
      } else {
        toast.error("Something went wrong")
      }
    }
  }

  return (
    <button
      onClick={handleFund}
      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg"
    >
      Fund with Paystack
    </button>
  )
}

export default FundWalletButton
