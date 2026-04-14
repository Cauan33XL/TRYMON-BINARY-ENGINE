import React, { useEffect, useRef, useState } from 'react';
import { KernelState } from '../services/kernelService';
import TrymonLogo from './TrymonLogo';

interface BootScreenProps {
  kernelState: KernelState;
}

const BootScreen: React.FC<BootScreenProps> = ({ kernelState }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bootProgress, setBootProgress] = useState(0);
  const [memCount, setMemCount] = useState(0);
  const [isPrePost, setIsPrePost] = useState(true);

  // Smooth 8-second boot synchronization (Memory + Loading Bar)
  useEffect(() => {
    if (kernelState.state === 'Booting') {
      const start = Date.now();
      const totalDuration = 5000;
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        setBootProgress(progress * 100);
        setMemCount(Math.floor(progress * 128));
        
        if (progress >= 1) {
          clearInterval(interval);
          setIsPrePost(false); // Ensure pre-post is cleared if still pending
        }
      }, 30);
      
      return () => clearInterval(interval);
    } else if (kernelState.state === 'Running') {
      setBootProgress(100);
      setMemCount(128);
      setIsPrePost(false);
    }
  }, [kernelState.state]);

  // Pre-POST delay trigger (Separate from progress for visual "cold boot" effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPrePost(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [kernelState.boot_logs]);

  if (isPrePost) {
    return (
      <div className="boot-screen pre-post">
        <div className="blinking-cursor">_</div>
        <style>{`
          .boot-screen.pre-post {
            background: #000;
            display: flex;
            align-items: flex-start;
            padding: 2rem;
            color: #fff;
            font-family: monospace;
          }
          .blinking-cursor {
            animation: blink 0.5s infinite;
            font-size: 1.5rem;
          }
          @keyframes blink { 
            0%, 100% { opacity: 1; } 
            50% { opacity: 0; } 
          }
        `}</style>
      </div>
    );
  }

  const segments = 45;
  const activeSegments = Math.floor((bootProgress / 100) * segments);

  return (
    <div className="boot-screen">
      <div className="crt-overlay" />
      <div className="scanline" />
      <div className="vignette" />
      
      <div className="boot-content">
        {/* BIOS Header - Ultra Fidelity */}
        <div className="boot-header-ultra">
          <div className="header-top-row">
            <div className="vendor-logo-block">
              <TrymonLogo size={110} animated glow={false} />
              <div className="energy-star">
                <div className="star-box">TRYMON</div>
                <div className="star-text">ENERGY EFFICIENT</div>
              </div>
            </div>
            <div className="bios-main-info">
              <h1 className="bios-title">TRYMON ADVANCED MODULAR BIOS v4.5.1</h1>
              <p>Copyright (C) 2026 Trymon Systems Corp.</p>
              <p className="build-id">Build ID: TRYMON-LX-2026-0414-827-VIRT</p>
            </div>
          </div>
        </div>

        {/* POST Core Metrics */}
        <div className="post-middle">
          <div className="post-col">
            <div className="post-row"><span>Main Processor</span>: <span className="val">WASM Virtual Core @ 3.4GHz</span></div>
            <div className="post-row"><span>Logic Family</span>: <span className="val">0x86_WASM_EXT_V2</span></div>
            <div className="post-row"><span>Memory Test</span> : <span className="val highlight">{memCount}MB OK</span></div>
          </div>
          <div className="post-col">
            <div className="post-row"><span>L1 Cache</span>  : <span className="val">256KB Internal</span></div>
            <div className="post-row"><span>L2 Cache</span>  : <span className="val">2048KB External</span></div>
            <div className="post-row"><span>System Bus</span>: <span className="val">0xDEADC0DE</span></div>
          </div>
        </div>

        {/* Hardware & IRQ Map */}
        <div className="hardware-map">
          <div className="map-grid">
            <div className="grid-header">VIRTUAL HARDWARE INVENTORY</div>
            <div className="grid-item"><span>VFS_0:</span> /root (8G)</div>
            <div className="grid-item"><span>VFS_1:</span> /home (4G)</div>
            <div className="grid-item"><span>IRQ_0:</span> TIMER</div>
            <div className="grid-item"><span>IRQ_1:</span> KEYBOARD</div>
            <div className="grid-item"><span>I/O_A:</span> VGA_CRTC</div>
            <div className="grid-item"><span>I/O_B:</span> NET_0</div>
          </div>
        </div>

        {/* Dynamic Log Scroll */}
        <div className="ultra-logs">
          <div className="logs-header-bar">REALTIME KERNEL INITIALIZATION LOGS</div>
          <div className="boot-logs" ref={scrollRef}>
            {kernelState?.boot_logs?.map((log, i) => (
              <div key={i} className={`boot-log-line ${log.includes('FATAL') ? 'error' : ''}`}>
                 <span className="bullet">█</span> {log}
              </div>
            ))}
            {kernelState?.state === 'Booting' && <div className="boot-cursor-static" />}
          </div>
        </div>

        {/* Retro Footer */}
        <div className="footer-ultra">
          <div className="status-row">
            <div className="load-status">BOOTING FROM VIRTUAL DRIVE 0...</div>
            <div className="load-progress">{Math.floor(bootProgress)}%</div>
          </div>
          
          <div className="segmented-bar">
             <span className="cap">[</span>
             {Array.from({ length: segments }).map((_, i) => (
               <div key={i} className={`block ${i < activeSegments ? 'filled' : ''}`} />
             ))}
             <span className="cap">]</span>
          </div>

          <div className="bios-short-hint">
             &lt;DEL&gt;: Setup  // &lt;F8&gt;: Boot Menu // &lt;F12&gt;: Network Boot  // &lt;ESC&gt;: Skip
          </div>
        </div>
      </div>

      <style>{`
        .boot-screen {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: #000200;
          color: #d1d1d1;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        .crt-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%), 
                      linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.03));
          background-size: 100% 4px, 4px 100%;
          pointer-events: none;
          z-index: 10;
        }

        .scanline {
          width: 100%; height: 120px;
          z-index: 11;
          background: linear-gradient(180deg, transparent 0%, rgba(209, 209, 209, 0.04) 50%, transparent 100%);
          position: absolute;
          animation: scanline 12s linear infinite;
        }

        .vignette {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%);
          pointer-events: none;
          z-index: 12;
        }

        .boot-content {
          width: 88%; height: 92%;
          display: flex; flex-direction: column;
          gap: 1rem; position: relative;
        }

        /* Ultra Header */
        .header-top-row {
          display: flex;
          align-items: flex-start;
          gap: 2rem;
          border-bottom: 3px double #666;
          padding-bottom: 1rem;
        }

        .vendor-logo-block {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }

        .energy-star {
          border: 1px solid #fff;
          padding: 2px 4px;
          text-align: center;
          font-weight: bold;
        }

        .star-box { border-bottom: 1px solid #fff; font-size: 0.6rem; }
        .star-text { font-size: 0.4rem; padding: 1px 0; }

        .bios-title { font-size: 1.3rem; color: #fff; margin: 0; letter-spacing: 1px; }
        .build-id { font-size: 0.75rem; color: #888; margin-top: 4px; }

        /* POST Metrics */
        .post-middle { display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; margin-top: 0.5rem; }
        .post-row { font-size: 0.85rem; margin-bottom: 2px; }
        .val { color: #fff; }
        .highlight { color: #ffff00; font-weight: bold; }

        /* Hardware Map */
        .hardware-map {
          background: rgba(255,255,255,0.03);
          border: 1px solid #444;
          padding: 10px;
        }

        .map-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
        }

        .grid-header { grid-column: span 3; font-size: 0.75rem; color: #aaa; border-bottom: 1px solid #444; margin-bottom: 4px; }
        .grid-item { font-size: 0.75rem; color: #f0f0f0; }
        .grid-item span { color: #888; font-weight: bold; }

        /* Advanced Logs */
        .ultra-logs {
          flex: 1;
          display: flex; flex-direction: column;
          background: #000; border: 1px solid #444; border-radius: 2px;
          overflow: hidden;
        }

        .logs-header-bar { background: #1a1a1a; font-size: 0.7rem; padding: 4px 10px; color: #888; }

        .boot-logs {
          padding: 10px; overflow-y: auto; font-size: 0.85rem;
          color: #00ff41; line-height: 1.2; scrollbar-width: none;
        }
        .boot-logs::-webkit-scrollbar { display: none; }

        .bullet { font-size: 0.6rem; color: #00ff4188; vertical-align: middle; margin-right: 4px; }
        .error { color: #ff7b72; text-shadow: 0 0 10px #ff0000; }

        .boot-cursor-static { display: inline-block; width: 8px; height: 12px; background: #00ff41; animation: blink 0.8s infinite; }

        /* Footer Ultra */
        .footer-ultra { display: flex; flex-direction: column; gap: 0.5rem; }
        .status-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: #aaa; }
        .load-progress { color: #fff; font-weight: bold; }

        .segmented-bar {
          display: flex; align-items: center; gap: 2px; color: #333;
        }

        .cap { font-size: 1.2rem; color: #666; font-weight: bold; }
        
        .block {
          width: 14px; height: 20px;
          background: #222; transition: all 0.1s;
        }

        .block.filled {
          background: #00ff41; box-shadow: 0 0 10px #7ee787;
        }

        .bios-short-hint { font-size: 0.75rem; text-align: center; opacity: 0.3; margin-top: 4px; }

        @keyframes scanline { 0% { top: -120px; } 100% { top: 100%; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

export default BootScreen;
