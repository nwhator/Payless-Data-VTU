import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerUser {
  id: number;
  name: string;
  email: string;
  role: "customer" | "agent";
}

interface CustomerProfileProps {
  user: CustomerUser;
  onProfileUpdate?: (updatedUser: CustomerUser) => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ user, onProfileUpdate }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // ---------------- Profile Update ----------------
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing || isSaving) return;

    if (newPassword !== '' && newPassword !== confirmPassword) {
      toast.error("New Password and Confirm Password do not match.");
      return;
    }

    setIsSaving(true);

    const payload: { name: string; email: string; password?: string; password_confirmation?: string } = { name, email };
    if (newPassword !== '') {
      payload.password = newPassword;
      payload.password_confirmation = confirmPassword;
    }

    try {
      const response = await axios.put('/user/api/profile', payload);
      if (response.status === 200 || response.status === 201) {
        toast.success("Profile updated successfully!");
        setNewPassword('');
        setConfirmPassword('');
        setIsEditing(false);

        if (onProfileUpdate) onProfileUpdate({ ...user, name, email });
      }
    } catch (error: unknown) {
      console.error('Update failed:', error);
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const errors = error.response.data.errors;
        let errorMessage = "Validation Failed:\n";
        for (const key in errors) {
          errorMessage += ` - ${errors[key].join(', ')}\n`;
        }
        toast.error(errorMessage);
      } else {
        toast.error('Profile update failed due to a server error.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------- Delete Account ----------------
  const handleDeleteAccount = async () => {
    if (deletePassword === '') {
      toast.error("Please enter your current password.");
      return;
    }

    setIsDeleting(true);

    try {
      await axios.delete('/user/api/account', { data: { password: deletePassword } });
      toast.success("Account deleted successfully!");
      window.location.href = '/';
    } catch (error: unknown) {
      console.error('Deletion failed:', error);
      if (axios.isAxiosError(error) && error.response?.data?.errors?.password) {
        toast.error(error.response.data.errors.password[0]);
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  const handleCancelEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Account Profile</h2>

      <form onSubmit={handleUpdateProfile} className="p-6 rounded-xl border border-gray-700 bg-[#071821] space-y-4">
        <h3 className="text-lg font-semibold border-b border-gray-800 pb-3 flex justify-between items-center">
          Personal Details
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-[#4DFF8F] text-black font-medium text-sm hover:bg-[#39cc70] transition duration-150 flex items-center gap-1"
            >
              <Pencil size={16} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isEditing || isSaving}
                className={`px-3 py-1.5 rounded-lg text-black font-medium text-sm transition duration-150 flex items-center gap-1 ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#4DFF8F] hover:bg-[#39cc70]'}`}
              >
                {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Update Profile'}
              </button>
            </div>
          )}
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-black/10 border border-gray-600 focus:ring focus:ring-[#4DFF8F]/50 focus:border-[#4DFF8F]"
            disabled={!isEditing || isSaving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-black/10 border border-gray-600 focus:ring focus:ring-[#4DFF8F]/50 focus:border-[#4DFF8F]"
            disabled={!isEditing || isSaving}
          />
        </div>

        <div className="pt-4 border-t border-gray-800 space-y-4">
          <h4 className="text-md font-semibold text-gray-300">Change Password (Optional)</h4>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-2 rounded bg-black/10 border border-gray-600 focus:ring focus:ring-[#4DFF8F]/50 focus:border-[#4DFF8F]"
            disabled={!isEditing || isSaving}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 rounded bg-black/10 border border-gray-600 focus:ring focus:ring-[#4DFF8F]/50 focus:border-[#4DFF8F]"
            disabled={!isEditing || isSaving}
          />
        </div>
      </form>

      {/* ---------------- Danger Zone ---------------- */}
      <div className="p-6 rounded-xl border border-red-700 bg-red-900/10 space-y-4">
        <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        <p className="text-sm text-red-300">Permanently delete your account. This action cannot be undone.</p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 flex items-center gap-2"
        >
          <Trash2 size={16} /> Delete Account
        </button>
      </div>

      {/* ---------------- Delete Modal ---------------- */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[#071821] p-6 rounded-xl w-96 space-y-4 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-red-400">Confirm Account Deletion</h4>
            <p className="text-gray-300 text-sm">Enter your password to confirm permanent deletion.</p>
            <input
              type="password"
              placeholder="Current Password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full p-2 rounded bg-black/10 border border-gray-600 focus:ring focus:ring-red-500/50 focus:border-red-500"
              disabled={isDeleting}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 rounded bg-gray-700 text-white hover:bg-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
