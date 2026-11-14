import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { PASSWORD_HINT, validatePassword } from '../utils/password';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
    dataPermission: user?.dataPermission ?? false,
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // The password is its own small form: it is saved on its own and does not close the modal.
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setIsDeleting(true);
    try {
      // On success the session ends and this modal goes away with the app.
      await deleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the account.');
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    const invalid = !passwords.current
      ? 'Enter your current password.'
      : validatePassword(passwords.next) ??
        (passwords.next === passwords.current ? 'The new password must differ from the current one.' : null);
    if (invalid) {
      setPasswordMessage({ ok: false, text: invalid });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setIsPasswordOpen(false);
      setPasswordMessage({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setPasswordMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not change the password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        dataPermission: formData.dataPermission,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enter in a password field belongs to the password, not to the profile form around it.
  const submitPasswordOnEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void handleChangePassword();
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              required
              min="1900-01-01"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>

          {user.role === 'student' && (
            <label className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dataPermission}
                onChange={(e) => setFormData({ ...formData, dataPermission: e.target.checked })}
                className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">
                Include my study data, anonymized and aggregated, in teacher analytics. Teachers never see
                individual students, and groups of fewer than five students are not shown. Turning this off
                removes your data from the analytics immediately.
              </span>
            </label>
          )}

          <div className="p-3 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700">Password</span>
              {!isPasswordOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordOpen(true);
                    setPasswordMessage(null);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Change Password
                </button>
              )}
            </div>
            {isPasswordOpen && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    maxLength={128}
                    onKeyDown={submitPasswordOnEnter}
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    onKeyDown={submitPasswordOnEnter}
                    value={passwords.next}
                    onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-600 mt-1">{PASSWORD_HINT}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Changing...' : 'Set New Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordOpen(false);
                      setPasswords({ current: '', next: '' });
                      setPasswordMessage(null);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Keep Current
                  </button>
                </div>
              </>
            )}
            {passwordMessage && (
              <p role="status" className={`text-sm ${passwordMessage.ok ? 'text-green-700' : 'text-red-700'}`}>
                {passwordMessage.text}
              </p>
            )}
          </div>

          <div className="p-3 border border-red-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700">Account</span>
              {!isDeleteOpen && (
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="px-3 py-1.5 text-sm text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Delete Account
                </button>
              )}
            </div>
            {isDeleteOpen && (
              <>
                <p className="text-xs text-red-700">
                  This permanently deletes your account with all subjects, topics, activities and history. It cannot
                  be undone.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password to Confirm</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    maxLength={128}
                    value={deletePassword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete My Account for Good'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Keep My Account
                  </button>
                </div>
                {deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
