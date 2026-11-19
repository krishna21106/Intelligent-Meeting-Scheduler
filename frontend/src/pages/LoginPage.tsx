import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldAlert,
  Activity,
  Laptop,
  Eye,
  EyeOff,
  Radio,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Zap,
  CheckCircle2,
  Network,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { Role } from '../types';

interface RoleDefinition {
  id: Role;
  name: string;
  badge: string;
  tier: string;
  icon: React.ComponentType<{ className?: string }>;
  colorKey: 'indigo' | 'amber' | 'emerald' | 'sky';
  bgGradient: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  borderGlow: string;
  accentBg: string;
  activeBorder: string;
  defaultUsername: string;
  defaultPassword: string;
  description: string;
  allowedAuthRoles: Role[];
  capabilities: string[];
  metrics: { label: string; value: string };
}

const ROLES: RoleDefinition[] = [
  {
    id: 'ADMIN',
    name: 'Administrator',
    badge: 'Root Superuser',
    tier: 'Tier 4 · Enterprise Governance',
    icon: ShieldAlert,
    colorKey: 'indigo',
    bgGradient: 'from-indigo-600 via-indigo-500 to-violet-600',
    badgeBorder: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    borderGlow: 'border-glow-indigo',
    accentBg: 'bg-indigo-500/15 text-indigo-400',
    activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/30',
    defaultUsername: 'admin',
    defaultPassword: 'Admin123!',
    description: 'Full orchestrator access across multi-datacenter topology, router mutations, user permissions, and configuration rollback.',
    allowedAuthRoles: ['ADMIN', 'OPERATOR', 'VIEWER'],
    capabilities: [
      'Core Backbone & Dynamic Topology Control',
      'Router & Switch Configuration Rollback',
      'Operator Quarantine Approvals & User Access',
      'Audit Ledger & Failure Injection Probes',
    ],
    metrics: { label: 'Global Scope', value: '40 Nodes / 3 Sites' },
  },
  {
    id: 'OPERATOR',
    name: 'Network Operator',
    badge: 'NOC Field Engineer',
    tier: 'Tier 3 · Incident & Telemetry',
    icon: Activity,
    colorKey: 'amber',
    bgGradient: 'from-amber-500 via-amber-600 to-orange-600',
    badgeBorder: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    borderGlow: 'border-glow-amber',
    accentBg: 'bg-amber-500/15 text-amber-400',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/30',
    defaultUsername: 'operator',
    defaultPassword: 'Operator123!',
    description: 'Surveillance operations, real-time SNMP OID telemetry polling, live ping/traceroute link diagnostics, and alert mitigation.',
    allowedAuthRoles: ['OPERATOR', 'ADMIN'],
    capabilities: [
      'Real-Time Telemetry & OID Metric Streaming',
      'Interactive Ping & Traceroute Diagnostics',
      'Active Alert Mitigation & Severity Escalation',
      'Interface Port Up/Down Administrative Controls',
    ],
    metrics: { label: 'Telemetry Rate', value: '10s Interval' },
  },
  {
    id: 'CUSTOMER',
    name: 'Student Station',
    badge: 'Lab Workstation PC',
    tier: 'Tier 2 · Educational Sandbox',
    icon: Laptop,
    colorKey: 'emerald',
    bgGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    badgeBorder: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    borderGlow: 'border-glow-emerald',
    accentBg: 'bg-emerald-500/15 text-emerald-400',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30',
    defaultUsername: 'student',
    defaultPassword: 'Student123!',
    description: 'Dedicated student workstation dashboard with assigned router/switch links, deep packet stream dissection, and self-service diagnostic tools.',
    allowedAuthRoles: ['CUSTOMER'],
    capabilities: [
      'Assigned Lab Workstation Telemetry',
      'Wireshark-Grade Deep Packet Dissection',
      '7-Layer OSI Protocol Stack Inspection',
      'Workstation Subnet Latency & Loss Diagnostics',
    ],
    metrics: { label: 'Inspection Engine', value: '7 OSI Layers' },
  },
  {
    id: 'VIEWER',
    name: 'Auditor & Observer',
    badge: 'Read-Only Academic Guest',
    tier: 'Tier 1 · SLA & Telemetry Observer',
    icon: Eye,
    colorKey: 'sky',
    bgGradient: 'from-sky-500 via-cyan-500 to-blue-600',
    badgeBorder: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    borderGlow: 'border-glow-sky',
    accentBg: 'bg-sky-500/15 text-sky-400',
    activeBorder: 'border-sky-500 ring-2 ring-sky-500/30',
    defaultUsername: 'viewer',
    defaultPassword: 'Viewer123!',
    description: 'Read-only access for evaluators, faculty review, real-time SLA metrics, visual topology exploration, and compliance reports.',
    allowedAuthRoles: ['VIEWER', 'ADMIN', 'OPERATOR'],
    capabilities: [
      'Interactive Global Topology Map Explorer',
      'Live 99.9% SLA & Latency Compliance Reports',
      'Public Grid Status & Incident Broadcasts',
      'Strict Zero-Mutation Academic Security Guard',
    ],
    metrics: { label: 'SLA Availability', value: '99.98% Live' },
  },
];

export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role>('ADMIN');
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'customer' | 'operator'>('customer');

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration specific fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLabSection, setRegLabSection] = useState('Lab 101 - Networking & Protocols');
  const [operatorPendingSubmitted, setOperatorPendingSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState<Role | null>(null);

  const { login, register } = useAuth();
  const { theme, template, toggleTemplate } = useTheme();
  const navigate = useNavigate();

  const currentRoleDef = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  // Auto-update inputs when role card is changed
  const handleSelectRole = (roleId: Role) => {
    setSelectedRole(roleId);
    setError(null);
    const target = ROLES.find((r) => r.id === roleId);
    if (target) {
      setUsername(target.defaultUsername);
      setPassword(target.defaultPassword);
    }
  };

  // Keyboard navigation: 1-4 for roles, Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'login') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '1') handleSelectRole('ADMIN');
      if (e.key === '2') handleSelectRole('OPERATOR');
      if (e.key === '3') handleSelectRole('CUSTOMER');
      if (e.key === '4') handleSelectRole('VIEWER');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (viewMode === 'register') {
        if (registerRole === 'operator') {
          setOperatorPendingSubmitted(true);
          setIsLoading(false);
          return;
        } else {
          // Register student station and navigate to home
          await register(regUsername.trim(), regEmail.trim(), regPassword);
          navigate('/');
        }
      } else {
        await executeLogin(username.trim(), password, currentRoleDef.allowedAuthRoles, currentRoleDef.id);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Unified login executor with auto-provisioning fallback for Student/Customer
  const executeLogin = async (userStr: string, passStr: string, allowedRoles: Role[], roleId: Role) => {
    try {
      await login(userStr, passStr, allowedRoles);
      navigate('/');
    } catch (err: any) {
      // If student account doesn't exist yet, auto-provision and login!
      if (roleId === 'CUSTOMER' && (err.message?.includes('Bad credentials') || err.message?.includes('not found') || err.message?.includes('401'))) {
        try {
          await register(userStr || 'student', 'student@cnip.network', passStr || 'Student123!');
          navigate('/');
          return;
        } catch (regErr: any) {
          throw new Error('Student workstation account could not be initialized: ' + (regErr.message || err.message));
        }
      }
      throw err;
    }
  };

  // 1-Click Instant Demo Login for any of the 4 roles
  const handleQuickLogin = async (roleDef: RoleDefinition) => {
    setSelectedRole(roleDef.id);
    setUsername(roleDef.defaultUsername);
    setPassword(roleDef.defaultPassword);
    setError(null);
    setIsLoading(true);
    setQuickLoginRole(roleDef.id);

    try {
      await executeLogin(roleDef.defaultUsername, roleDef.defaultPassword, roleDef.allowedAuthRoles, roleDef.id);
    } catch (err: any) {
      setError(err.message || `Demo authentication failed for ${roleDef.name}.`);
    } finally {
      setIsLoading(false);
      setQuickLoginRole(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-indigo-500/30 selection:text-indigo-400">
      {/* Top Global Status & Template Navigation Bar */}
      <header className="w-full flex items-center justify-between px-6 py-3.5 border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-foreground">CNIP Lab NOC</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.5 Quad-Portal
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Department of Computer Science & Engineering · Multi-Tier Network Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live System Health Pulse */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px]">Grid Online · 40/40 Nodes · 10 Gbps</span>
          </div>

          {/* Interactive Visual Template Switcher */}
          <button
            type="button"
            onClick={toggleTemplate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all shadow-xs"
            title={`Switch Theme Template (Currently: ${template === 'cyber-dark' ? 'Cyber Dark NOC' : 'Clean Light Campus'})`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline text-xs">
              {template === 'cyber-dark' ? 'Cyber Dark NOC' : 'Clean Light Campus'}
            </span>
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Interactive Cyber NOC Visualizer & Dynamic SVG Topology Graph */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-slate-950 text-white relative flex-col justify-between p-10 xl:p-14 overflow-hidden border-r border-slate-800">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />

          {/* Header Sub-branding */}
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Enterprise & Educational Laboratory Infrastructure</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
              Next-Generation <br />
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Quad-Role Telemetry & Live Packet Dissection
              </span>
            </h2>

            <p className="text-xs xl:text-sm text-slate-400 max-w-lg leading-relaxed">
              Designed for collegiate computer networks and enterprise NOC operations. Provides isolated router
              sandboxes, Wireshark-grade deep packet inspection, 7-layer OSI telemetry, and automated fault injection.
            </p>
          </div>

          {/* Interactive Animated SVG Topology Radar Showcase */}
          <div className="relative z-10 py-6 my-auto">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-2 text-indigo-400 font-semibold">
                  <Network className="w-4 h-4" /> Live Backbone Simulation Matrix
                </span>
                <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Latency: 12.4ms
                </span>
              </div>

              {/* SVG Animated Topology Grid */}
              <div className="relative h-48 w-full flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 460 180" fill="none">
                  {/* Connection lines with dash animations */}
                  <line x1="70" y1="90" x2="230" y2="40" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" className="opacity-60" />
                  <line x1="70" y1="90" x2="230" y2="140" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 4" className="opacity-60" />
                  <line x1="230" y1="40" x2="390" y2="60" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" className="opacity-60" />
                  <line x1="230" y1="140" x2="390" y2="120" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" className="opacity-60" />
                  <line x1="230" y1="40" x2="230" y2="140" stroke="#8b5cf6" strokeWidth="2" className="opacity-40" />

                  {/* Pulsing signal dots flowing on paths */}
                  <circle cx="150" cy="65" r="3.5" fill="#6366f1">
                    <animate attributeName="cx" values="70;230;70" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="90;40;90" dur="4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="310" cy="50" r="3.5" fill="#10b981">
                    <animate attributeName="cx" values="230;390;230" dur="3.5s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="40;60;40" dur="3.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Node 1: Border Router */}
                  <g transform="translate(45, 65)">
                    <rect width="50" height="50" rx="12" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
                    <circle cx="25" cy="25" r="16" fill="#6366f1" fillOpacity="0.2" />
                    <text x="25" y="29" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="bold">RTR-01</text>
                    <text x="25" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Core Spine</text>
                  </g>

                  {/* Node 2: Distribution Switch A */}
                  <g transform="translate(205, 15)">
                    <rect width="50" height="50" rx="12" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                    <circle cx="25" cy="25" r="16" fill="#06b6d4" fillOpacity="0.2" />
                    <text x="25" y="29" textAnchor="middle" fill="#a5f3fc" fontSize="10" fontWeight="bold">SW-100G</text>
                    <text x="25" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Spine Fabric</text>
                  </g>

                  {/* Node 3: Firewall DMZ */}
                  <g transform="translate(205, 115)">
                    <rect width="50" height="50" rx="12" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
                    <circle cx="25" cy="25" r="16" fill="#f59e0b" fillOpacity="0.2" />
                    <text x="25" y="29" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">NG-FW</text>
                    <text x="25" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Perimeter</text>
                  </g>

                  {/* Node 4: Student Lab Workstation */}
                  <g transform="translate(365, 35)">
                    <rect width="50" height="50" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                    <circle cx="25" cy="25" r="16" fill="#10b981" fillOpacity="0.2" />
                    <text x="25" y="29" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="bold">LAB-PC</text>
                    <text x="25" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Workstation</text>
                  </g>

                  {/* Node 5: Telemetry Collector */}
                  <g transform="translate(365, 95)">
                    <rect width="50" height="50" rx="12" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                    <circle cx="25" cy="25" r="16" fill="#818cf8" fillOpacity="0.2" />
                    <text x="25" y="29" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="bold">SNMP</text>
                    <text x="25" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Polling 10s</text>
                  </g>
                </svg>
              </div>

              {/* Bottom Micro Metrics Bar */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-[10px]">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-slate-400 block">Backbone</span>
                  <span className="font-bold text-white font-mono">10 Gbps</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-slate-400 block">Inventory</span>
                  <span className="font-bold text-cyan-400 font-mono">40 Nodes</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-slate-400 block">OSI Layers</span>
                  <span className="font-bold text-emerald-400 font-mono">All 7 Monitored</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-slate-400 block">SLA Target</span>
                  <span className="font-bold text-indigo-400 font-mono">99.98%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer Info */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
            <span className="font-medium">Multi-Tier Laboratory & Network Operations System</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
          </div>
        </div>

        {/* Right Column: 4-Login Panel Interactive Workspace */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-8 max-w-2xl mx-auto w-full">
          {/* View Mode Switcher Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                <span>Quad-Panel Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  4 Roles
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {viewMode === 'login'
                  ? 'Select one of the 4 access tiers below to sign in or use 1-click demo access'
                  : 'Register a new student workstation or request operator verification'}
              </p>
            </div>

            <div className="flex rounded-xl bg-muted/60 p-1 border border-border/70 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setOperatorPendingSubmitted(false);
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'login'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setOperatorPendingSubmitted(false);
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'register'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* SIGN IN VIEW: THE 4 LOGIN PANELS */}
          {viewMode === 'login' && (
            <div className="space-y-6">
              {/* THE 4 ROLE SELECTION CARDS (QUAD MATRIX) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Access Role (Keys 1-4)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click card or hit 1-Click Demo</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ROLES.map((roleDef, index) => {
                    const isSelected = selectedRole === roleDef.id;
                    const Icon = roleDef.icon;

                    return (
                      <div
                        key={roleDef.id}
                        onClick={() => handleSelectRole(roleDef.id)}
                        className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? `bg-card shadow-md ${roleDef.activeBorder} ${roleDef.borderGlow}`
                            : 'bg-muted/30 border-border/80 hover:bg-muted/60 hover:border-border'
                        }`}
                      >
                        {/* Top Card Bar: Key Index & Icon */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold transition-transform group-hover:scale-105 ${
                                isSelected ? roleDef.accentBg : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                              {index + 1}
                            </span>
                          </div>

                          <h3 className="font-bold text-xs text-foreground leading-tight">{roleDef.name}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{roleDef.badge}</p>
                        </div>

                        {/* Bottom Quick Demo Button on each card */}
                        <div className="pt-2.5 mt-2 border-t border-border/50 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickLogin(roleDef);
                            }}
                            disabled={isLoading}
                            className={`w-full py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-primary text-primary-foreground hover:opacity-90'
                                : 'bg-muted hover:bg-foreground/10 text-foreground'
                            }`}
                            title={`1-Click Instant Demo Login as ${roleDef.name}`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-400" />
                            <span>{quickLoginRole === roleDef.id ? 'Connecting...' : '1-Click Demo'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE ROLE HIGHLIGHT & CAPABILITY BANNER */}
              <div
                className={`p-4 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xs transition-all duration-300 ${currentRoleDef.borderGlow}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${currentRoleDef.bgGradient} flex items-center justify-center text-white shadow-md`}
                    >
                      <currentRoleDef.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm text-foreground">{currentRoleDef.name} Portal</h2>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${currentRoleDef.badgeBg} ${currentRoleDef.badgeText} ${currentRoleDef.badgeBorder}`}
                        >
                          {currentRoleDef.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{currentRoleDef.tier}</p>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-muted-foreground block">{currentRoleDef.metrics.label}</span>
                    <span className="text-xs font-bold text-foreground font-mono">{currentRoleDef.metrics.value}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-t border-border/60 pt-2.5">
                  {currentRoleDef.description}
                </p>

                {/* Capability Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {currentRoleDef.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* ERROR ALERT BANNER */}
              {error && (
                <div className="p-3.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* CREDENTIALS FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Username / Station ID
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Preset: <strong className="text-foreground">{currentRoleDef.defaultUsername}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Preset: <strong className="text-foreground">{currentRoleDef.defaultPassword}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Remember station credentials</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin(currentRoleDef)}
                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Instant Fill & Enter
                  </button>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full shadow-lg shadow-indigo-500/20"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Authenticate & Enter {currentRoleDef.name}
                  </Button>
                </div>
              </form>

              {/* Bottom Quick-Switch Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Need a student account or operator clearance?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('register');
                      setError(null);
                    }}
                    className="font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                  >
                    Open Registration
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* REGISTRATION VIEW */}
          {viewMode === 'register' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Type Switcher */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/70">
                <span className="text-xs font-bold text-muted-foreground block mb-2">
                  Select Registration Type:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('customer')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      registerRole === 'customer'
                        ? 'bg-background text-foreground border-emerald-500/60 shadow-xs'
                        : 'border-transparent text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold">Student Station</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-normal mt-1">
                      Instant access to student laboratory workstation
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterRole('operator')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      registerRole === 'operator'
                        ? 'bg-background text-foreground border-amber-500/60 shadow-xs'
                        : 'border-transparent text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span className="font-bold">Lab Operator</span>
                      </div>
                      <Badge variant="warning" size="sm">
                        Quarantine
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-normal mt-1">
                      Requires supervisor verification
                    </span>
                  </button>
                </div>
              </div>

              {/* Operator Pending Banner */}
              {operatorPendingSubmitted && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <h3 className="font-bold text-sm tracking-tight text-foreground">
                      Awaiting Administrator Approval
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your operator signup request for <strong className="text-foreground">{regLabSection}</strong> has
                    been quarantined. In accordance with laboratory security policy, new operators cannot access core
                    switches until verified by a supervisor.
                  </p>
                  <div className="p-3 rounded-xl bg-background/80 border border-amber-500/20 text-xs font-mono text-muted-foreground">
                    <div>Applicant: <span className="text-foreground font-bold">{regFullName || regUsername}</span></div>
                    <div>Target Section: <span className="text-foreground font-bold">{regLabSection}</span></div>
                    <div>Status: <span className="text-amber-500 font-bold">Quarantined (Pending Review)</span></div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOperatorPendingSubmitted(false);
                      setViewMode('login');
                    }}
                  >
                    Return to 4-Panel Sign In
                  </Button>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              {!operatorPendingSubmitted && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {registerRole === 'operator' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="e.g. Dr. Alan Turing"
                          className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Assigned Lab Section
                        </label>
                        <select
                          value={regLabSection}
                          onChange={(e) => setRegLabSection(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Lab 101 - Networking & Protocols">Lab 101 - Networking & Protocols</option>
                          <option value="Lab 204 - Advanced Routing & Switching">Lab 204 - Advanced Routing & Switching</option>
                          <option value="Lab 305 - Wireless & Network Security">Lab 305 - Wireless & Network Security</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Desired Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Choose username"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Set strong password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      isLoading={isLoading}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {registerRole === 'operator'
                        ? 'Submit Operator Verification Application'
                        : 'Register & Enter Student Station'}
                    </Button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('login')}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                    >
                      ← Back to Quad-Panel Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
