import { useState } from 'react';
import { Settings, Activity, Cpu, User } from 'lucide-react';

export default function SettingsApp({ userName, onUserNameChange }: { userName: string; onUserNameChange: (name: string) => void }) {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="settings-window">
      <div className="settings-sidebar">
        <button className={`settings-nav-item ${activeSection === 'general' ? 'active' : ''}`} onClick={() => setActiveSection('general')}>
          <Settings size={16} /> Geral
        </button>
        <button className={`settings-nav-item ${activeSection === 'profile' ? 'active' : ''}`} onClick={() => setActiveSection('profile')}>
          <User size={16} /> Perfil
        </button>
        <button className={`settings-nav-item ${activeSection === 'network' ? 'active' : ''}`} onClick={() => setActiveSection('network')}>
          <Activity size={16} /> Rede
        </button>
        <button className={`settings-nav-item ${activeSection === 'security' ? 'active' : ''}`} onClick={() => setActiveSection('security')}>
          <Settings size={16} /> Segurança
        </button>
        <button className={`settings-nav-item ${activeSection === 'display' ? 'active' : ''}`} onClick={() => setActiveSection('display')}>
          <Settings size={16} /> Display
        </button>
      </div>
      <div className="settings-content">
        {activeSection === 'general' && (
          <>
            <div className="settings-section">
              <h3><Cpu size={16} /> Sistema</h3>
              <div className="setting-item">
                <label>Nome do Host</label>
                <input type="text" defaultValue="trymon" />
              </div>
              <div className="setting-item">
                <label>Memória RAM</label>
                <select defaultValue="128">
                  <option value="64">64 MB</option>
                  <option value="128">128 MB</option>
                  <option value="256">256 MB</option>
                  <option value="512">512 MB</option>
                </select>
              </div>
            </div>
            <div className="settings-section">
              <h3><Settings size={16} /> Comportamento</h3>
              <div className="setting-item toggle">
                <label>Iniciar com o sistema</label>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="setting-item toggle">
                <label>Mostrar ícones na área de trabalho</label>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          </>
        )}
        {activeSection === 'profile' && (
          <div className="settings-section">
            <h3><User size={16} /> Perfil do Usuário</h3>
            <div className="setting-item">
              <label>Nome de Usuário</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => onUserNameChange(e.target.value)}
                placeholder="Ex: root, admin, user"
              />
            </div>
            <div className="setting-item">
              <label>Avatar</label>
              <div className="avatar-placeholder" style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'var(--accent-cyan, #00f2ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#000',
                fontWeight: 'bold'
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        )}
        {activeSection === 'network' && (
          <div className="settings-section">
            <h3><Activity size={16} /> Configurações de Rede</h3>
            <div className="setting-item toggle">
              <label>Habilitar rede</label>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="setting-item">
              <label>Modo de rede</label>
              <select defaultValue="user">
                <option value="user">NAT (Compartilhado)</option>
                <option value="bridge">Ponte (Bridge)</option>
                <option value="host">Host-only</option>
              </select>
            </div>
          </div>
        )}
        {activeSection === 'security' && (
          <div className="settings-section">
            <h3><Settings size={16} /> Segurança</h3>
            <div className="setting-item toggle">
              <label>Habilitar sandbox</label>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="setting-item toggle">
              <label>Bloquear acesso à rede por padrão</label>
              <input type="checkbox" />
            </div>
            <div className="setting-item toggle">
              <label>Log desystema</label>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        )}
        {activeSection === 'display' && (
          <div className="settings-section">
            <h3><Settings size={16} /> Display</h3>
            <div className="setting-item">
              <label>Resolução</label>
              <select defaultValue="1024x768">
                <option value="800x600">800 x 600</option>
                <option value="1024x768">1024 x 768</option>
                <option value="1280x720">1280 x 720</option>
                <option value="1920x1080">1920 x 1080</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


