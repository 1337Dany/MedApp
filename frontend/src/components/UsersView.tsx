import { useEffect, useState } from 'react';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { User, UserRole } from '../types/auth';

const ROLE_LABELS: Record<UserRole, string> = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };

// Admin only: grant or remove the teacher and admin roles.
export function UsersView() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    usersAPI
      .getAll()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load users.'));
  }, []);

  const changeRole = async (id: string, role: UserRole) => {
    setError('');
    setSavingId(id);
    try {
      const updated = await usersAPI.setRole(id, role);
      setUsers((current) => current?.map((u) => (u.id === id ? updated : u)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Users</h2>
        <p className="text-gray-600 mt-1">
          Everyone registers as a student. Grant the teacher role here; it applies at the user&apos;s next sign-in or
          within 15 minutes.
        </p>
      </div>

      {error && <p className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</p>}

      {!users ? (
        !error && <p className="text-gray-500">Loading users...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <select
                value={user.role}
                disabled={user.id === me?.id || savingId === user.id}
                onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
