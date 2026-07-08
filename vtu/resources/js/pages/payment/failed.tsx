import React from 'react';
import { Head, usePage } from '@inertiajs/react';

// --- Interfaces for Page Props ---
interface PaymentFailedProps {
    store_name?: string;
    error?: string;
}

const PaymentFailed: React.FC = () => {
    const { store_name, error } = usePage().props as PaymentFailedProps;

    const handleClose = () => {
        window.close();
    };

    return (
        <>
            <Head title="Payment Failed" />
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div className="max-w-md w-full text-center bg-gray-800 p-8 rounded-xl shadow-2xl border-t-4 border-red-500">
                    
                    {/* Error Icon */}
                    <div className="bg-red-500/10 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                        <svg
                            className="w-10 h-10 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-extrabold text-white mb-3">
                        Payment Failed
                    </h1>

                    <p className="text-gray-400 mb-6 text-lg">
                        {error || 'We could not complete your payment. Please try again.'}
                    </p>

                    {/* Support Section with Admin Email */}
                    <div className="bg-gray-700/30 rounded-lg p-4 mb-8 border border-gray-700">
                        <p className="text-sm text-gray-400 mb-2">
                            If money was deducted, please contact support immediately:
                        </p>
                        <a 
                            href="mailto:admin@paylessdata.org"
                            className="text-red-400 font-bold text-lg hover:text-red-300 transition underline"
                        >
                            admin@paylessdata.org
                        </a>
                    </div>

                    {/* Primary Action: Close Window */}
                    <button
                        onClick={handleClose}
                        className="w-full py-3.5 px-4 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 transition duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Close Window
                    </button>

                    <div className="mt-8 text-sm text-gray-500">
                        <p>{store_name || 'Payless Data Store'}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentFailed;