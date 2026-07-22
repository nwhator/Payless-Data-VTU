import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { toast } from "sonner"
import { AnimatePresence } from "framer-motion"
import EmptyState from "../EmptyState"
import AgentStoreView from "../AgentStoreView"
import StoreModal from "../modals/StoreModal"
import PublishModal from "../modals/PublishModal"
import StoreEditor from "../StoreEditor"
import { StoreData } from "../types"


const AgentStore: React.FC<{
    loading?: boolean
    setLoading?: (value: boolean) => void
    setActive: (key: string) => void
}> = ({ loading, setLoading, setActive }) => {
    const [store, setStore] = useState<StoreData | null>(null)
    const [publishing, setPublishing] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [storeProducts, setStoreProducts] = useState<any[]>([])
    const [productsLoading, setProductsLoading] = useState(false)

    // Fetch store from backend
    useEffect(() => {
        const loadStore = async () => {
            try {
                setLoading?.(true)
                const { data } = await axios.get("/agent/store")
                if (data.success && data.store) {
                    setStore(data.store)
                }
            } catch {
                toast.error("Failed to load store info")
            } finally {
                setLoading?.(false)
            }
        }
        loadStore()
    }, [setLoading])

    // --- NEW: Unpublish Store Function ---
    const unpublishStore = async () => {
        if (!store) return

        try {
            setPublishing(true)
            const { data } = await axios.post("/agent/store/unpublish", {})

            if (data.success) {
                toast.info("Store set to draft.")
                setStore({ ...store, publish: "draft" })
            } else {
                toast.error(data.message || "❌ Failed to unpublish store")
            }
        } catch (error) {
            console.error("Unpublish Store failed:", error);
            toast.error("❌ Error unpublishing store.")
        } finally {
            setPublishing(false)
        }
    }

    // --- NEW: Delete Store Function ---
    const deleteStore = async () => {
        if (!store) return

        try {
            setPublishing(true) // Use publishing state to prevent multiple clicks
            const { data } = await axios.delete(`/agent/store/${store.id}`)

            if (data.success) {
                toast.success("🗑️ Store deleted successfully!")
                // Clear the store state, which will render the EmptyState
                setStore(null) 
            } else {
                toast.error(data.message || "❌ Failed to delete store")
            }
        } catch (error) {
          console.error("Delete Store failed:", error);
            toast.error("❌ Error deleting store.")
        } finally {
            setPublishing(false)
        }
    }
    
    // Function to publish the store
    const publishStore = async () => {
        try {
            setPublishing(true)
            const { data } = await axios.post(
                "/agent/store/publish",
                {}
            )

            interface PublishResponse {
                success: boolean
                message?: string
                reason?: string
            }

            const response = data as PublishResponse

            if (response.success) {
                toast.success("🚀 Store published successfully!")
                if (store) setStore({ ...store, publish: "published" })
            } else if (response.reason === "unpriced_products") {
                // If 422 error or specific reason from server, show modal
                setShowPublishModal(true)
            } else {
                toast.error(response.message || "❌ Failed to publish store")
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 422) {
                    setShowPublishModal(true)
                } else {
                    toast.error(
                        error.response?.data?.message ||
                        "❌ Error publishing store (server issue)"
                    )
                }
            } else {
                toast.error("❌ Unexpected error occurred")
            }
        } finally {
            setPublishing(false)
        }
    }

    // Fetch store products when store is available
    useEffect(() => {
        const loadStoreProducts = async () => {
            if (!store) return;
            setProductsLoading(true);
            try {
                const { data } = await axios.get("/agent/products");
                if (data.success) {
                    setStoreProducts(data.products || []);
                }
            } catch {
                toast.error("Failed to load store products");
            } finally {
                setProductsLoading(false);
            }
        };
        loadStoreProducts();
    }, [store]);

    return (
        <div className="p-4 sm:p-6">
            {loading ? (
                <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-[#4DFF8F] border-t-transparent rounded-full animate-spin"></div>
                        <p>Loading your store...</p>
                    </div>
                </div>
            ) : !store ? (
                <EmptyState onCreate={() => setShowModal(true)} />
            ) : editMode ? (
                <StoreEditor
                    store={store}
                    onCancel={() => setEditMode(false)}
                    onSaved={(newStore) => {
                        setStore(newStore)
                        setEditMode(false)
                    }}
                />
            ) : (
                <AgentStoreView
                    store={store}
                    onPublish={publishStore}
                    onUnpublish={unpublishStore} // 👈 Added
                    onDelete={deleteStore}       // 👈 Added
                    publishing={publishing}
                    onEdit={() => setEditMode(true)}
                    onSetActive={setActive}
                    products={storeProducts}
                    loading={productsLoading}
                />
            )}

            {/* Create Store Modal */}
            <AnimatePresence>
                {showModal && (
                    <StoreModal
                        store={store}
                        onClose={() => setShowModal(false)}
                        onSaved={(newStore) => {
                            setStore(newStore);
                            setShowModal(false);
                            // Load products after store is created
                            if (newStore) {
                                setTimeout(async () => {
                                    try {
                                        const { data } = await axios.get("/agent/products");
                                        if (data.success) {
                                            setStoreProducts(data.products || []);
                                        }
                                    } catch {}
                                }, 500);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Publish Warning Modal */}
            <AnimatePresence>
                {showPublishModal && (
                    <PublishModal
                        onClose={() => setShowPublishModal(false)}
                        onGoToPricing={() => {
                            setShowPublishModal(false)
                            setActive("pricing")
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default AgentStore