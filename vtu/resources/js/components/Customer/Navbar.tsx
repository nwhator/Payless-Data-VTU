import React from 'react';
import { Menu } from 'lucide-react';

interface Props {
  active: string;
  setActive: (k: string) => void;
  onMenuClick: () => void;
  customerName: string;
}

const titles: Record<string, string> = {
  overview: 'Overview',
  purchases: 'Purchases',
  profile: 'Profile',
  upgrade: 'Become an Agent',
  support: 'Support',
};

// FUNCTION TO GET GHANA TIME GREETING
const getGreeting = () => {
  const now = new Date();
  // Ghana time is UTC+0
  const hours = now.getUTCHours();

  if (hours >= 5 && hours < 12) return 'Good morning';
  if (hours >= 12 && hours < 17) return 'Good afternoon';
  return 'Good evening';
};

const Navbar: React.FC<Props> = ({ active, onMenuClick, customerName }) => {
  const greeting = getGreeting();

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#071821] lg:pl-72">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-gray-800"
        >
          <Menu />
        </button>
        <h2 className="text-lg font-semibold">{titles[active] || 'Customer'}</h2>
      </div>

      <div className="text-sm text-gray-300">
        {greeting}, <span className="font-semibold text-white">{customerName}</span>
      </div>
    </header>
  );
};

export default Navbar;
