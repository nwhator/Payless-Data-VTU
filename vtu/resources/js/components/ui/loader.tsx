import React from "react";

interface LoaderProps {
  size?: number;
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 28, }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="status"
        
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#00C4FF"
          strokeWidth="3"
          strokeOpacity="0.2"
          fill="none"
        />
        <path
          d="M22 12A10 10 0 0012 2"
          stroke="#4DFF8F"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      
    </div>
  );
};

export default Loader;
