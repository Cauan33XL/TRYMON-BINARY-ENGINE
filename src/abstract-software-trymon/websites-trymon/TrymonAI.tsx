import React, { useState } from 'react';

export default function TrymonAI() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Olá! Eu sou a Trymon Intelligence. Como posso ajudar você hoje no sistema?' }
  ]);
  const [input, setInput] = useState('');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const userIn = input.toLowerCase();
    setInput('');

    setTimeout(() => {
      let reply = 'Interessante. Como uma IA residente do kernel, eu posso monitorar seus binários e arquivos.';
      if (userIn.includes('bin')) reply = 'Você tem vários binários carregados no momento. Posso listar eles para você no terminal.';
      if (userIn.includes('quem')) reply = 'Eu sou a Trymon AI, desenvolvida para otimizar a execução de binários WASM e gerenciar o VFS.';

      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    }, 600);
  };

  return (
    <div className="ai-page">
      <div className="ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="ai-input-area">
        <div className="browser-address-bar">
          <input
            type="text"
            placeholder="Pergunte à Trymon AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" style={{ display: 'none' }} />
        </div>
      </form>
    </div>
  );
}
