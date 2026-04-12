import React, { useState } from 'react';
import { 
  Terminal, 
  Cpu, 
  FileCode, 
  Activity, 
  Settings, 
  ChevronRight, 
  ShieldCheck, 
  Upload,
  Box
} from 'lucide-react';

type TabType = 'dashboard' | 'binaries' | 'terminal' | 'monitoring' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div className="dashboard-container">
      <div className="bg-mesh" />
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            <Box size={20} color="white" />
          </div>
          <span>TRYMON</span>
        </div>

        <nav style={{ flex: 1 }}>
          <NavLink 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<Activity size={18} />} 
            label="Dashboard" 
          />
          <NavLink 
            active={activeTab === 'binaries'} 
            onClick={() => setActiveTab('binaries')} 
            icon={<FileCode size={18} />} 
            label="Binaries Manager" 
          />
          <NavLink 
            active={activeTab === 'terminal'} 
            onClick={() => setActiveTab('terminal')} 
            icon={<Terminal size={18} />} 
            label="System Terminal" 
          />
          <NavLink 
            active={activeTab === 'monitoring'} 
            onClick={() => setActiveTab('monitoring')} 
            icon={<Cpu size={18} />} 
            label="Resource Monitor" 
          />
        </nav>

        <div className="sidebar-footer">
          <NavLink 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={18} />} 
            label="Settings" 
          />
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>System</span>
          <ChevronRight size={14} color="var(--text-secondary)" />
          <span style={{ textTransform: 'capitalize' }}>{activeTab}</span>
        </div>

        <div className="status-badge">
          <div className="status-dot" />
          <span>Kernel (v86) Ready</span>
          <ShieldCheck size={14} style={{ marginLeft: '4px' }} />
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <WelcomeDashboard />}
          {activeTab === 'binaries' && <BinariesView />}
          {activeTab === 'terminal' && <TerminalView />}
          {activeTab === 'monitoring' && <Placeholder name="Monitoring" />}
          {activeTab === 'settings' && <Placeholder name="Settings" />}
        </div>
      </main>
    </div>
  );
}

function NavLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <div className={`nav-link ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function WelcomeDashboard() {
  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome to TRYNAMON Engine</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        A secure runtime for native Linux binaries on the web.
      </p>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-cyan)" /> System Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span color="var(--text-secondary)">Uptime</span>
              <span>0h 02m 14s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span color="var(--text-secondary)">CPU Load</span>
              <span color="var(--accent-cyan)">12%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span color="var(--text-secondary)">Memory</span>
              <span>128MB / 512MB</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--accent-cyan)" /> Security Profile
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Running in high-isolation mode. Native filesystem access is restricted to the virtual container.
          </p>
          <button style={{ 
            marginTop: '16px', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            border: 'none', 
            background: 'var(--accent-blue)', 
            color: 'white',
            cursor: 'pointer'
          }}>
            Check Firewall
          </button>
        </div>
      </div>
    </div>
  );
}

function BinariesView() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
      <Upload size={48} color="var(--border-color)" style={{ marginBottom: '16px' }} />
      <h2>Binary Upload Center</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Drag and drop your .AppImage, .deb, or .rpm files here to execute.
      </p>
      <input type="file" id="binary-upload" hidden />
      <label htmlFor="binary-upload" style={{
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px dashed var(--border-color)',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'inline-block'
      }}>
        Select File from Computer
      </label>
    </div>
  );
}

function TerminalView() {
  return (
    <div>
      <div className="terminal-header">
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <span>trymon@binary-shell ~$</span>
        <div />
      </div>
      <div className="terminal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#aaa' }}>Initializing v86 runtime...</p>
      </div>
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
      <h2 style={{ color: 'var(--text-secondary)' }}>{name} view coming soon</h2>
    </div>
  );
}
