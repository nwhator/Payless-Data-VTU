import React from 'react';

interface Props {
  // Data passed from the CustomerController
  message: string;
  userName: string; // The user's name (e.g., 'John')
  orderId?: number | string; // Optional order reference ID
}

export default function PurchaseSuccess({ message, userName, orderId }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-lg bg-gray-800 p-8 md:p-12 rounded-2xl shadow-2xl text-center border-t-4 border-green-500 transition-all duration-300">
        <div className="text-7xl text-green-500 mb-6 animate-bounce">
          🎉
        </div>
        
        {/* Personalized Greeting using userName */}
        <h2 className="text-xl font-semibold text-green-300 mb-2">
          Hi, {userName}!
        </h2>
        
        <h1 className="text-3xl font-extrabold text-white mb-4">
          Payment Successful!
        </h1>
        
        {/* Personalized Message containing the name and product */}
        <p className="text-xl text-gray-300 mb-6 font-medium">
          {message}
        </p>
        
        {orderId && (
            <p className="text-sm text-gray-400 mb-4">
                Reference ID: <span className="font-mono text-gray-200">{orderId}</span>
            </p>
        )}
        
        <p className="text-md text-gray-400 mb-10">
          We've queued your purchase for delivery. Please check your phone for a confirmation message shortly, or view the status on your dashboard.
        </p>

        <a
          href="/dashboard/customer" // <-- DIRECT URL USED INSTEAD OF route('dashboard')
          className="w-full inline-block bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-gray-900 font-bold py-3 px-6 rounded-xl transition duration-300 transform hover:scale-[1.02] shadow-lg"
        >
          Go to Dashboard 🚀
        </a>
      </div>
    </div>
  );
}