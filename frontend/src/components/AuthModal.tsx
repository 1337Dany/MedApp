import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../services/api';
import { ApiError } from '../services/http';
import { toDateInputValue } from '../utils/dates';
import { PASSWORD_HINT, validatePassword } from '../utils/password';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  password: '',
  dataPermission: false,
};


type Mode = 'login' | 'register' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'Sign In',
  register: 'Create Account',
  forgot: 'Reset Password',
  reset: 'Choose a New Password',
};
const SUBMIT_LABELS: Record<Mode, string> = {
  login: 'Sign In',
  register: 'Create Account',
  forgot: 'Send Reset Link',
  reset: 'Set New Password',
};

export function AuthModal() {
  // The link of a password-reset mail opens the app with ?resetToken=...: it goes straight to the new password.
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken'));
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [notice, setNotice] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'register' || mode === 'reset') {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else if (mode === 'forgot') {
        await authAPI.forgotPassword(formData.email.trim());
        // The same answer for every address: the API does not reveal which ones have an account.
        setNotice('If this address has an account, a mail with a reset link is on its way. The link is valid for one hour.');
      } else if (mode === 'reset') {
        await authAPI.resetPassword(resetToken!, formData.password);
        leaveResetLink();
        setFormData(EMPTY_FORM);
        setMode('login');
        setNotice('Your password has been changed. Sign in with the new one.');
      } else {
        await register({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth,
          email: formData.email.trim(),
          password: formData.password,
          dataPermission: formData.dataPermission,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // The token is used up (or refused): drop it from the address bar so a reload does not come back here.
  const leaveResetLink = () => window.history.replaceState(null, '', window.location.pathname);

  const switchMode = (next: Mode) => {
    if (mode === 'reset') leaveResetLink();
    setMode(next);
    setError('');
    setNotice('');
  };

  const inputClass =
    'w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
  // The local date: toISOString() is UTC and can be a day off.
  const today = toDateInputValue(new Date());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {TITLES[mode]}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {notice && (
            <p role="status" className="p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">
              {notice}
            </p>
          )}

          {mode === 'forgot' && (
            <p className="text-sm text-gray-600">
              Enter the email address of your account. We will send you a link to choose a new password.
            </p>
          )}

          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={inputClass}
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    required
                    min="1900-01-01"
                    max={today}
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {mode !== 'reset' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                maxLength={75}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          )}

          {mode !== 'forgot' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{mode === 'reset' ? 'New Password *' : 'Password *'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                maxLength={128}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {(mode === 'register' || mode === 'reset') && (
              <p className="text-xs text-gray-600 mt-1">{PASSWORD_HINT}</p>
            )}
          </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dataPermission}
                onChange={(e) => setFormData({ ...formData, dataPermission: e.target.checked })}
                className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">
                Include my study data, anonymized and aggregated, in teacher analytics. You can change this
                later in your profile.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Please wait...' : SUBMIT_LABELS[mode]}
          </button>

          <div className="flex flex-col items-center gap-2">
            {mode === 'login' && (
              <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-blue-600 hover:text-blue-700">
                Forgot password?
              </button>
            )}
            {mode === 'login' || mode === 'register' ? (
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('login')} className="text-sm text-blue-600 hover:text-blue-700">
                Back to login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
