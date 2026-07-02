import React from 'react';
import { StoreData } from "./types"

interface StoreViewProps {
    store: StoreData
    onPublish: () => void
    onUnpublish: () => void
    onDelete: () => void
    onEdit: () => void
    publishing?: boolean
}

const StoreView = ({ 
    store, 
    onPublish, 
    onUnpublish, 
    onDelete, 
    onEdit, 
    publishing = false 
}: StoreViewProps) => {

    // --- Action Handlers with Alerts ---
    
    const handleUnpublish = () => {
        if (window.confirm(`Are you sure you want to unpublish "${store.store_name}"? This will make it inaccessible to customers.`)) {
            onUnpublish();
        }
    };
    
    const handleDelete = () => {
        if (window.confirm(`WARNING: Deleting "${store.store_name}" is permanent and cannot be undone. Are you absolutely sure?`)) {
            onDelete();
        }
    };

    // --- Icon SVGs (Simplified for Tailwind/React use) ---

    // Pencil/Edit Icon
    const EditIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    );

    // Draft/Unpublish Icon (Paper)
    const UnpublishIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );

    // Delete/Trash Icon
    const DeleteIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );

    // Checkmark/Publish Icon
    const PublishIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    // --- Button Group Rendering Logic ---
    const isPublished = store.publish === "published";

    const PublishedButtons = (
        <>
            {/* Unpublish Button */}
            <button
                onClick={handleUnpublish}
                disabled={publishing}
                // Reduced padding to make buttons tighter, and text size is now 'xs' on small screens
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition-all ${
                    publishing 
                        ? "bg-yellow-600/60 cursor-wait text-black"
                        : "bg-yellow-500 text-black hover:bg-yellow-600"
                }`}
                title="Unpublish Store (Set to Draft)"
            >
                {UnpublishIcon}
                <span>Unpublish</span>
            </button>
            
            {/* Delete Button */}
            <button
                onClick={handleDelete}
                disabled={publishing}
                // Reduced padding and text size
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 transition-all ${
                    publishing 
                        ? "bg-red-600/60 cursor-wait text-white"
                        : "bg-red-600 text-white hover:bg-red-700"
                }`}
                title="Permanently Delete Store"
            >
                {DeleteIcon}
                <span>Delete</span>
            </button>
        </>
    );

    const DraftButtons = (
        <button
            onClick={onPublish}
            disabled={publishing}
            // Uses text-sm consistently for publish button
            className={`px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                publishing
                    ? "bg-[#4DFF8F]/60 cursor-wait text-black font-bold"
                    : "bg-[#4DFF8F] text-black font-bold hover:bg-[#6dff9f]"
            }`}
            title="Publish Store"
        >
            {publishing ? (
                <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Publishing...</span>
                </>
            ) : (
                <>
                    {PublishIcon}
                    <span>Publish Store</span>
                </>
            )}
        </button>
    );


    return (
        <div className="max-w-3xl mx-auto bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-white">{store.store_name}</h2>
            <p className="text-slate-400 mb-4 text-sm sm:text-base">{store.description}</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <a
                    href={`${window.location.origin}/store/${store.store_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00C4FF] underline break-all"
                    title="View Public Store Link"
                >
                    🔗 {window.location.origin}/store/{store.store_slug}
                </a>

                <div className="flex flex-wrap gap-3">
                    {/* Edit Button is always visible, using icon */}
                    <button
                        onClick={onEdit}
                        // Reduced padding and added icon
                        className="px-3 py-2 rounded-xl bg-[#00C4FF] text-black font-bold text-xs sm:text-sm flex items-center gap-1 hover:bg-[#33d8ff] transition-all"
                        title="Edit Store Details"
                    >
                        {EditIcon}
                        <span>Edit</span>
                    </button>

                    {/* Conditional Buttons (Published or Draft) */}
                    {isPublished ? PublishedButtons : DraftButtons}
                </div>
            </div>
        </div>
    );
}

export default StoreView;