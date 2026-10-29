import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Radio,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'staff' | 'customer' | 'register'>('staff');
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === 'register') {
        await register(username, email, password);
      } else {
        await login(username, password, mode === 'customer' ? ['CUSTOMER'] : ['ADMIN', 'OPERATOR', 'VIEWER']);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
    setIsLoading(true);
    try {
      await login(user, pass, ['ADMIN', 'OPERATOR', 'VIEWER']);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left Column: CNIP Brand & Network Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 text-white relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CNIP Network Manager</h1>
            <p className="text-xs text-slate-400">Enterprise Network Observability & Control</p>
          </div>
        </div>

        {/* Center Illustration & Metrics Display */}
        <div className="relative z-10 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Autonomous Telemetry & Failure Simulation</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Unified Observability Across Enterprise Infrastructure
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mb-8 leading-relaxed">
            Monitor real-time latency, link utilization, diurnal traffic curves, and config drift across 40+ simulated and SNMP4J managed devices.
          </p>

          {/* Mini Live Preview Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-slate-200">Global Network Health</span>
              </div>
              <span className="text-emerald-400 font-bold font-tabular">98.4% Nominal</span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-3 text-center">
              <div>
                <p className="text-[11px] text-slate-400">Total Devices</p>
                <p className="text-lg font-bold font-tabular text-white mt-0.5">40</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Active Sites</p>
                <p className="text-lg font-bold font-tabular text-white mt-0.5">3 Sites</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Poll Interval</p>
                <p className="text-lg font-bold font-tabular text-white mt-0.5">10s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between">
          <span>CNIP NMS v1.0 • Java 21 & React</span>
          <span>Role-Based Access Control Active</span>
        </div>
      </div>

      {/* Right Column: Clean Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                C
              </div>
              <span className="font-bold text-lg">CNIP Network Manager</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === 'register' ? 'Create your customer account' : mode === 'customer' ? 'Customer sign in' : 'Staff & administrator sign in'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'register' ? 'Register to view devices assigned to your account.' : mode === 'customer' ? 'Sign in to view your assigned devices and alerts.' : 'Sign in to manage and monitor the CNIP network.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/50 p-1" aria-label="Account access type">
            {([
              ['staff', 'Staff'],
              ['customer', 'Customer'],
              ['register', 'Register'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                  setUsername(value === 'staff' ? 'admin' : '');
                  setPassword(value === 'staff' ? 'Admin123!' : '');
                  setEmail('');
                }}
                aria-pressed={mode === value}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition ${mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={mode === 'register' ? 10 : undefined}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'register' ? 'Create customer account' : mode === 'customer' ? 'Sign in as customer' : 'Sign in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          {mode === 'staff' && <div className="pt-4 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center mb-3">
              1-Click Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin123!')}
                className="p-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-medium text-foreground transition text-center group"
              >
                <div className="font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                  Admin
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Full Control</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator', 'Operator123!')}
                className="p-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-medium text-foreground transition text-center group"
              >
                <div className="font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">
                  Operator
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Alerts & Config</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer', 'Viewer123!')}
                className="p-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-medium text-foreground transition text-center group"
              >
                <div className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                  Viewer
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Read-Only</div>
              </button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
};
