import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';

interface PaymentSuccessProps {
    store_name?: string;
    store_slug?: string;
    message?: string;
}

const PaymentSuccess: React.FC = () => {
    const { store_name, store_slug, message } = usePage().props as PaymentSuccessProps;
    const [closeFailed, setCloseFailed] = useState(false);

    const handleClose = () => {
        window.close();
        setTimeout(() => setCloseFailed(true), 500);
    };

    const storeUrl = store_slug ? `${window.location.origin}/store/${store_slug}` : null;

    return (
        <>
            <Head title="Payment Successful" />
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div className="max-w-md w-full text-center bg-gray-800 p-8 rounded-xl shadow-2xl border-t-4 border-green-500">
                    
                    <div className="bg-green-500/10 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                        <svg
                            className="w-10 h-10 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-extrabold text-white mb-3">
                        Payment Verified!
                    </h1>

                    <p className="text-gray-400 mb-8 text-lg leading-relaxed">
                        {message || 'Your transaction was successful. You will receive your data bundle shortly.'}
                    </p>

                    {!closeFailed ? (
                        <button
                            onClick={handleClose}
                            className="w-full py-3.5 px-4 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 transition duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Close Window
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400">Window could not close automatically. Please close this tab manually.</p>
                            {storeUrl && (
                                <a
                                    href={storeUrl}
                                    className="block w-full py-3.5 px-4 rounded-lg font-bold text-white bg-[#00C4FF] hover:bg-[#33d8ff] transition"
                                >
                                    Return to Store
                                </a>
                            )}
                        </div>
                    )}

                    <div className="mt-8 text-sm text-gray-500">
                        <p>Thank you for using {store_name || 'our service'}.</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentSuccess;