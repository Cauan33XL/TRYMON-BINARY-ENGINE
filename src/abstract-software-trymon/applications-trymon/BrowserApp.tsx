import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, ChevronLeft, ChevronRight, RotateCw, Home, ShieldCheck, 
  ExternalLink, RefreshCw, Search, Package, Cpu, MessageSquare, 
  FolderPlus, Info, FileCode, Trash2, Plus, Image as ImageIcon,
  Activity, FileText
} from 'lucide-react';
import * as kernel from '../../interface/services/kernelService';
import TrymonLogo from '../../interface/components/TrymonLogo';
import TrymordWebsite from '../websites-trymon/TrymordWebsite';
import TrymonAI from '../websites-trymon/TrymonAI';
import TrymonDocs from '../websites-trymon/TrymonDocs';

export default function BrowserApp() {
  const [url, setUrl] = useState('trymon://home');
  const [inputUrl, setInputUrl] = useState('trymon://home');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(['trymon://home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [virtualSiteData, setVirtualSiteData] = useState<any>(null);

  const navigateTo = useCallback((newUrl: string, addToHistory = true) => {
    let formattedUrl = newUrl.trim();

    const looksLikeUrl = formattedUrl.includes('.') && !formattedUrl.includes(' ');
    const isInternal = formattedUrl.startsWith('trymon://');
    const hasProtocol = formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://');

    if (!isInternal && !hasProtocol) {
      if (looksLikeUrl) {
        formattedUrl = `https://${formattedUrl}`;
      } else {
        formattedUrl = `trymon://search?q=${encodeURIComponent(formattedUrl)}`;
      }
    }

    setUrl(formattedUrl);
    setInputUrl(formattedUrl);

    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(formattedUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    setIsLoading(true);
    setVirtualSiteData(null); // Reset when navigating
    setTimeout(() => setIsLoading(false), 600);
  }, [history, historyIndex]);

  // Resolve Virtual Sites from VFS
  useEffect(() => {
    if (url.startsWith('trymon://') && !['home', 'ai', 'docs', 'search'].some(p => url.includes(p))) {
      const siteName = url.replace('trymon://', '').split('?')[0];
      const filePath = `/www/${siteName}/index.json`;
      const content = kernel.readFile(filePath);

      if (content) {
        try {
          const json = JSON.parse(new TextDecoder().decode(content));
          setVirtualSiteData(json);
        } catch (e) {
          console.error("Failed to parse site JSON", e);
        }
      }
    }
  }, [url]);

  const goBack = () => {
    if (historyIndex > 0) {
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setUrl(prevUrl);
      setInputUrl(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setUrl(nextUrl);
      setInputUrl(nextUrl);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const renderContent = () => {
    if (url === 'trymon://home') return <BrowserHomepage navigateTo={navigateTo} inputUrl={inputUrl} setInputUrl={setInputUrl} handleSearch={handleSearch} />;
    if (url.startsWith('trymon://search')) return <TrymonSERP url={url} navigateTo={navigateTo} />;
    if (url === 'trymon://ai') return <TrymonAI />;
    if (url === 'trymon://docs') return <TrymonDocs />;
    if (url === 'trymon://trymord') return <TrymordWebsite />;

    if (virtualSiteData) return <VirtualSiteRenderer navigateTo={navigateTo} data={virtualSiteData} />;

    return (
      <iframe
        src={url}
        className="browser-iframe"
        title="Browser Content"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  };

  return (
    <div className="browser-window">
      <div className="browser-toolbar">
        <div className="browser-nav-group">
          <button className="browser-nav-btn" onClick={goBack} disabled={historyIndex === 0} title="Voltar">
            <ChevronLeft size={18} />
          </button>
          <button className="browser-nav-btn" onClick={goForward} disabled={historyIndex === history.length - 1} title="Avançar">
            <ChevronRight size={18} />
          </button>
          <button className="browser-nav-btn" onClick={() => navigateTo(url, false)} title="Recarregar">
            <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button className="browser-nav-btn" onClick={() => navigateTo('trymon://home')} title="Página Inicial">
            <Home size={18} />
          </button>
        </div>

        <div className="browser-address-container">
          <form onSubmit={handleSearch} className="browser-address-bar">
            <div className="browser-security-icon">
              {url.startsWith('trymon://') ? <ShieldCheck size={14} color="#00f2ff" /> : <ShieldCheck size={14} />}
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Search or enter URL"
            />
            {isLoading && <RefreshCw size={12} className="animate-spin text-muted" />}
          </form>
        </div>

        <div className="browser-nav-group">
          <button
            className="browser-nav-btn"
            onClick={() => window.open(url.startsWith('trymon://') ? 'https://google.com' : url, '_blank')}
            title="External View"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      <div className="browser-content">
        {isLoading && (
          <div className="loading-bar-container">
            <div className={`loading-bar active`} style={{ width: '100%' }} />
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}

function BrowserHomepage({ navigateTo, inputUrl, setInputUrl, handleSearch }: any) {
  return (
    <div className="browser-homepage">
      <div className="hp-logo">
        <TrymonLogo size={64} glow={true} />
        <h1>TRYMON SEARCH</h1>
      </div>

      <form onSubmit={handleSearch} className="hp-search">
        <div className="browser-address-bar" style={{ padding: '12px 24px', borderRadius: '30px' }}>
          <Search size={20} className="text-muted" />
          <input
            type="text"
            placeholder="Pesquisar websites trymon:// ou URLs externas..."
            value={inputUrl === 'trymon://home' ? '' : inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            style={{ fontSize: '16px' }}
          />
        </div>
      </form>

      <div className="hp-shortcuts">
        {[
          { name: 'App Store', url: 'trymon://store', icon: <Package size={24} color="#00f2ff" />, premium: true },
          { name: 'Trymon AI', url: 'trymon://ai', icon: <Cpu size={24} color="#00f2ff" />, premium: true },
          { name: 'Trymord', url: 'trymon://trymord', icon: <MessageSquare size={24} color="#5865f2" />, premium: true },
          { name: 'Cloud Drive', url: 'trymon://cloud', icon: <FolderPlus size={24} color="#ffa657" /> },
          { name: 'Trymon News', url: 'trymon://social', icon: <Activity size={24} color="#7ee787" /> },
          { name: 'Docs', url: 'trymon://docs', icon: <Info size={24} /> },
          { name: 'Vercel', url: 'https://vercel.com', icon: <Globe size={24} /> },
        ].map((sc, i) => (
          <div key={i} className={`hp-shortcut ${sc.premium ? 'premium-border' : ''}`} onClick={() => navigateTo(sc.url)}>
            <div className="hp-shortcut-icon">{sc.icon}</div>
            <span>{sc.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VirtualSiteRenderer({ data, navigateTo }: { data: any, navigateTo: any }) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileCode': return <FileCode size={20} />;
      case 'Image': return <ImageIcon size={20} />;
      case 'Activity': return <Activity size={20} />;
      case 'Trash2': return <Trash2 size={20} />;
      case 'Cpu': return <Cpu size={20} />;
      case 'ShieldCheck': return <ShieldCheck size={20} />;
      case 'Package': return <Package size={20} />;
      case 'FileText': return <FileText size={20} />;
      default: return <Globe size={20} />;
    }
  };

  return (
    <div className="vsite-container">
      <header className="vsite-header" style={{ background: `linear-gradient(180deg, ${data.theme}1a 0%, transparent 100%)` }}>
        <h1>{data.title}</h1>
        <p>{data.hero}</p>
      </header>
      <div className="vsite-content">
        {data.sections.map((section: any, i: number) => (
          <div key={i} className="vsite-section">
            <h2 className="vsite-section-title">{section.title}</h2>
            <div className="vsite-grid">
              {section.items.map((item: any, j: number) => (
                <div key={j} className="vsite-card" onClick={() => item.action === 'Run' ? navigateTo('trymon://docs') : null}>
                  <div className="vsite-card-icon">{getIcon(item.icon)}</div>
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  {item.action && (
                    <div className="vsite-card-action">
                      <Plus size={14} />
                      <span>{item.action} Now</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrymonSERP({ url, navigateTo }: { url: string; navigateTo: any }) {
  const query = new URLSearchParams(url.split('?')[1]).get('q') || '';

  const results = [
    {
      title: 'Trymon Intelligence AI',
      url: 'trymon://ai',
      desc: 'O assistente oficial do Trymon OS. Potente, rápido e integrado diretamente ao kernel Rust.',
      internal: true
    },
    {
      title: 'Global Application Store',
      url: 'trymon://store',
      desc: 'Explore e instale pacotes binários verificados para o ambiente Trymon.',
      internal: true
    },
    {
      title: 'Documentação Técnica Trymon',
      url: 'trymon://docs',
      desc: 'Guia completo para desenvolvedores, binários e formatos de arquivos especializados do sistema.',
      internal: true
    },
    {
      title: `Web results for: ${query}`,
      url: `https://www.bing.com/search?q=${query}`,
      desc: `Visualizando resultados externos para "${query}" via Trymon Engine Bridge.`,
      external: true
    }
  ];

  return (
    <div className="serp-container">
      <div className="serp-header">
        <h2>Resultados para: {query}</h2>
      </div>
      <div className="serp-results">
        {results.map((res, i) => (
          <div key={i} className="serp-item" style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="url">{res.url}</span>
            <div className="title" onClick={() => navigateTo(res.url)}>
              {res.internal && <span className="serp-badge">TRYMON NATIVE</span>}
              {res.title}
            </div>
            <p className="desc">{res.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
