import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Droplets, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/authStore';
import { authApi } from '@/features/auth/api/auth';
import { extractError } from '@/core/api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { role: 'Admin',            email: 'admin@rumawasco.go.ke' },
  { role: 'Manager',          email: 'manager@rumawasco.go.ke' },
  { role: 'Billing Officer',  email: 'billing@rumawasco.go.ke' },
  { role: 'Meter Reader',     email: 'reader@rumawasco.go.ke' },
  { role: 'Customer Service', email: 'customer.service@rumawasco.go.ke' },
  { role: 'Customer',         email: 'customer@rumawasco.go.ke' },
];

export const Login = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@rumawasco.go.ke', password: 'password' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const res = await authApi.login(data.email, data.password);
      setAuth(res.user, res.accessToken, res.refreshToken);
      navigate(res.user.role === 'customer' ? '/portal' : '/');
    } catch (err) {
      setError(extractError(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-900 via-primary-900 to-gray-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
              top: `${10 + i * 12}%`, left: `${-5 + i * 15}%`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-water-600 to-primary-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">RUMAWASCO</h1>
            <p className="text-water-200 text-sm mt-1">Water Billing & Management System</p>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="input-base pl-9"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input-base pl-9 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Remember me
                </label>
                <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center py-2.5"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Demo accounts — password: <span className="font-mono text-primary-700">password</span></p>
              <div className="grid grid-cols-1 gap-1">
                {DEMO_ACCOUNTS.map(({ role, email }) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => {
                      setValue('email', email, { shouldValidate: false });
                      setValue('password', 'password', { shouldValidate: false });
                      setError('');
                    }}
                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-200 transition-colors text-left w-full"
                  >
                    <span className="text-xs text-gray-500 w-32">{role}</span>
                    <span className="font-mono text-xs text-primary-700 truncate">{email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Click a row to auto-fill credentials</p>
            </div>
          </div>
        </div>

        <p className="text-center text-water-300 text-xs mt-4">
          © 2026 RUMAWASCO · Water Billing & Management System
        </p>
      </div>
    </div>
  );
};
