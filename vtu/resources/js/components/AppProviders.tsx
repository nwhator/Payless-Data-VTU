import { ReactNode } from "react"
import { Toaster } from "sonner"

interface AppProvidersProps {
  children: ReactNode
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          style: { background: "#001A23", color: "white" },
        }}
      />
    </>
  )
}
