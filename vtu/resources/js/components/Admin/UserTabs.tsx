import React from "react"

interface Props {
  selected: "all" | "agents" | "customers"
  setSelected: (s: "all" | "agents" | "customers") => void
}

const UserTabs: React.FC<Props> = ({ selected, setSelected }) => {
  const tabs = [
    { key: "all", label: "All Users" },
    { key: "agents", label: "Agents" },
    { key: "customers", label: "Customers" },
  ] as const

  return (
    <div className="flex gap-3 border-b border-white/10 mb-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setSelected(tab.key)}
          className={`pb-2 px-3 font-medium ${
            selected === tab.key
              ? "text-[#00C4FF] border-b-2 border-[#00C4FF]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default UserTabs
