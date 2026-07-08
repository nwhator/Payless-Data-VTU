import React from 'react';
import axios from 'axios'; // 1. Import axios
import { Home, List, User, Award, LifeBuoy, LogOut } from 'lucide-react'; // 1. Import LogOut icon
import { Link, usePage } from "@inertiajs/react";

interface Props {
  active: string;
  setActive: (key: string) => void;
  mobileOpen: boolean;
  onClose: () => void;
}

const items = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'purchases', label: 'Purchases', icon: List },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'upgrade', label: 'Become Agent', icon: Award },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  // 3. Add the Logout item
  { key: 'logout', label: 'Logout', icon: LogOut }, 
];

// 2. Function to handle POST request for logout
const handleLogout = async () => {
  try {
    // Note: Assuming your customer logout endpoint is '/logout'
    // If it's different from the agent one, adjust this path:
    await axios.post('/customer/logout'); // Use the customer-specific logout route

    // 2. If the request succeeds (200 OK): Manually redirect the user.
    window.location.href = "/login"; 
  } catch (error) {
    // 3. Handle errors (e.g., network failure, or server returning non-200)
    console.error("Logout failed:", error);
    // Redirect anyway for user experience, unless you need to show an error message.
    window.location.href = "/login"; 
  }
}

const Sidebar: React.FC<Props> = ({ active, setActive, mobileOpen, onClose }) => {
    
    const { url, props } = usePage()
    const auth = props.auth as { user: any };
    const user = auth?.user;
    
  return (
    <aside className={`fixed z-30 inset-y-0 left-0 w-64 bg-[#071821] border-r border-gray-800 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300`}>
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link href={url} className="flex items-center gap-2">
            <img
              src="/assets/images/logo.png"
              alt="Logo"
              className="w-9 h-9 object-contain"
            />
            <h3 className="font-bold text-xl text-white">Payless Data</h3>
          </Link>

          <p className="text-sm text-gray-400 mt-1">Customer Control</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map((it) => {
            const Icon = it.icon as any;
            // Determine styling
            const isActive = active === it.key;
            const activeClass = isActive 
              ? 'bg-[#0f1724] border-l-4 border-[#4DFF8F] text-white' 
              : 'text-gray-300 hover:bg-[#0b1520]';
            
            // Special styling for Logout
            const logoutClass = it.key === 'logout' ? 'text-red-400 hover:text-red-300' : '';

            let label = it.label;
            if (it.key === 'upgrade') {
              if (user?.upgrade_status === 'pending') {
                label = 'Upgrade Status ⏳';
              } else if (user?.upgrade_status === 'approved' || user?.role === 'agent') {
                label = 'Agent Portal 🎉';
              }
            }

            return (
              <button 
                key={it.key} 
                onClick={() => { 
                  if (it.key === 'logout') {
                    handleLogout(); // 3. Call logout function
                  } else {
                    setActive(it.key); 
                  }
                  onClose(); 
                }} 
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md transition ${activeClass} ${logoutClass}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <small className="text-xs text-gray-500">Need help? Contact support</small>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;