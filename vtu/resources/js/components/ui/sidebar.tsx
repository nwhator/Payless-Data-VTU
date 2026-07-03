import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Slot } from "@radix-ui/react-slot";

type SidebarContextType = {
  open: boolean;
  state: "expanded" | "collapsed";
  setOpen: (value: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children, defaultOpen = true }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const toggleSidebar = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    const handleResize = () => setOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, state: open ? "expanded" : "collapsed", setOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}

export function Sidebar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { open } = useSidebar();
  return (
    <aside
      className={`${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:static top-0 left-0 z-40 w-64 h-full bg-[#001A23] border-r border-white/10 flex flex-col transition-transform duration-300 ${className}`}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-b border-white/10">{children}</div>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto">{children}</div>;
}

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-t border-white/10">{children}</div>;
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-1">{children}</ul>;
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

export function SidebarInset({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 w-full ${className}`}>{children}</div>;
}

export function SidebarGroup({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col gap-1 p-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupContent({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-2 mb-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarMenuButton({
  children,
  onClick,
  className = "",
  asChild = false,
  size,
  isActive,
  tooltip,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: string;
  isActive?: boolean;
  tooltip?: unknown;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition text-left ${isActive ? "bg-white/10" : ""} ${className}`}
      data-size={size}
      data-tooltip={tooltip ? "true" : undefined}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function SidebarToggleButton({ className = "" }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className={`lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#001A23] text-white rounded-md shadow-md hover:opacity-80 ${className}`}
    >
      ☰
    </button>
  );
}
