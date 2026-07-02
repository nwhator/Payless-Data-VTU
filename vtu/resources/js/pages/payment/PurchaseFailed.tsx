import React from 'react';

interface Props {
  // Data passed from the CustomerController
  errorMessage: string; // The specific error message
  userName: string;     // The user's name for greeting
}

export default function PurchaseFailed({ errorMessage, userName }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-lg bg-gray-800 p-8 md:p-12 rounded-2xl shadow-2xl text-center border-t-4 border-red-500 transition-all duration-300">
        <div className="text-7xl text-red-500 mb-6 animate-pulse">
          ❌
        </div>
        
        {/* Personalized Greeting */}
        <h2 className="text-xl font-semibold text-red-300 mb-2">
          Hi, {userName}.
        </h2>
        
        <h1 className="text-3xl font-extrabold text-white mb-4">
          Payment Failed
        </h1>
        
        {/* Error Message */}
        <p className="text-xl text-gray-300 mb-6 font-medium">
          {errorMessage}
        </p>
        
        <p className="text-md text-gray-400 mb-10">
          No worries! You were not charged. Please check your payment details or try a different payment method.
        </p>

        <a
          href="/dashboard/customer" // Direct URL to the user's dashboard
          className="w-full inline-block bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300 transform hover:scale-[1.02] shadow-lg"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}