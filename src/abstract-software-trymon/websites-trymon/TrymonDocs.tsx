export default function TrymonDocs() {
  return (
    <div className="docs-page">
      <section className="docs-section">
        <h1>Centro de Desenvolvedores Trymon</h1>
        <p>Bem-vindo à documentação oficial. O Trymon OS utiliza um kernel escrito em Rust compilado para WebAssembly para fornecer alto desempenho.</p>
      </section>

      <section className="docs-section">
        <h2>Execução de Binários</h2>
        <p>Para executar um binário no Trymon, use o comando `execute` no terminal:</p>
        <div className="docs-code">
          $ execute my_app.bin --args
        </div>
      </section>

      <section className="docs-section">
        <h2>Virtual File System (VFS)</h2>
        <p>O sistema de arquivos é persistente e utiliza IndexedDB para salvar seu estado entre sessões.</p>
        <ul>
          <li>/home/trymon - Diretório do usuário</li>
          <li>/bin - Binários do sistema</li>
          <li>/etc - Configurações</li>
        </ul>
      </section>
    </div>
  );
}
