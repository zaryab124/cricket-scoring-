import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { UserRole } from '../../types/index.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { Button } from '../../components/common/Button.js';
import { Mail, Lock, User as UserIcon, Phone } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'VIEWER' as UserRole,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toastError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      success('Account created successfully! Welcome to Cricket Master.');
      navigate('/dashboard');
    } catch (err: any) {
      toastError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 text-2xl font-black shadow-glow-emerald mb-4">
          🏏
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white uppercase">
          Create <span className="text-emerald-400">Account</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Join the Cricket Master platform with your designated role
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="e.g. Rahul"
                icon={<UserIcon className="w-4 h-4" />}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="e.g. Dravid"
                required
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. user@cricketmaster.io"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Min. 6 characters"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                placeholder="+1 555 0199"
                icon={<Phone className="w-4 h-4" />}
              />

              <Select
                label="Initial Account Role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value as UserRole)}
                options={[
                  { label: 'Viewer / Fan', value: 'VIEWER' },
                  { label: 'Player', value: 'PLAYER' },
                  { label: 'Team Manager', value: 'TEAM_MANAGER' },
                  { label: 'Official Scorer', value: 'SCORER' },
                  { label: 'League Admin', value: 'LEAGUE_ADMIN' },
                  { label: 'Tournament Admin', value: 'TOURNAMENT_ADMIN' },
                  { label: 'Super Admin', value: 'SUPER_ADMIN' },
                ]}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Register Account
              </Button>
            </div>
          </form>

          <div className="text-center pt-5 border-t border-slate-800 mt-5">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
