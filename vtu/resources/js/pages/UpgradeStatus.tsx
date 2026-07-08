import React, { useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';

// Local Props (not really used but left here for clarity/extendability)
interface UpgradeStatusProps {}

// Success Icon
const SuccessIcon: React.FC = () => (
    <svg
        className="mx-auto h-16 w-16 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

// Error Icon
const ErrorIcon: React.FC = () => (
    <svg
        className="mx-auto h-16 w-16 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const UpgradeStatus: React.FC<UpgradeStatusProps> = () => {

    // --- 1. Extract & decode URL parameters ---
    const { isSuccess, message, status } = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);

        const status = urlParams.get("status");
        const rawMessage = urlParams.get("message");

        const decodedMessage = rawMessage
            ? decodeURIComponent(rawMessage)
            : "Processing complete.";

        return {
            status,
            isSuccess: status === "success",
            message: decodedMessage,
        };
    }, []);

    // --- 2. Clean URL by removing query params after load ---
    useEffect(() => {
        if (!status) return;
        router.visit(window.location.pathname, {
            replace: true,
            preserveScroll: true,
        });
    }, [status]);

    // --- 3. UI Text / Styling ---
    const pageTitle = isSuccess ? "Upgrade Complete! 🎉" : "Transaction Failed";
    const boxClass = isSuccess
        ? "bg-green-100 border-green-500 text-green-800"
        : "bg-red-100 border-red-500 text-red-800";

    const mainButtonText = isSuccess ? "Go to Agent Dashboard" : "Review Upgrade Options";
    const mainButtonLink = isSuccess ? "/dashboard" : "/dashboard";

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Head title="Upgrade Status" />

            <div className="w-full max-w-lg bg-white shadow-2xl rounded-xl p-8 sm:p-10">

                {/* Icon + Title */}
                <div className="text-center mb-8">
                    {isSuccess ? <SuccessIcon /> : <ErrorIcon />}
                    <h1 className="mt-4 text-3xl font-extrabold text-gray-900">{pageTitle}</h1>
                </div>

                {/* Message */}
                <div className={`p-4 border-l-4 rounded-lg mb-8 ${boxClass}`}>
                    <p className="text-base font-medium">{message}</p>
                </div>

                {/* Main Action Button */}
                <Link
                    href={mainButtonLink}
                    className={`w-full flex justify-center py-3 px-4 rounded-lg text-lg font-medium text-white shadow-xl transition duration-200 uppercase tracking-wider ${
                        isSuccess ? "bg-indigo-600 hover:bg-indigo-700" : "bg-yellow-600 hover:bg-yellow-700"
                    }`}
                >
                    {mainButtonText}
                </Link>

                {/* Secondary Links */}
                <div className="mt-8 text-center space-x-6">
                    
                    {!isSuccess && (
                        <Link
                            href="/dashboard"
                            className="text-sm text-indigo-500 hover:text-indigo-600 font-medium"
                        >
                            Go back to Upgrade Page
                        </Link>
                    )}

                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Go back Home (/)
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default UpgradeStatus;
