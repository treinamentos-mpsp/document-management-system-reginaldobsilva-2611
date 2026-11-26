import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listDocuments(controller.signal)
      .then(setDocuments)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-content">
          <a className="brand" href="/" aria-label="Documentos, página inicial">
            <span className="brand-mark" aria-hidden="true">D</span>
            <span>Documentos</span>
          </a>
          <span className="workspace-label">Espaço de trabalho</span>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">BIBLIOTECA</p>
            <h1>Seus documentos</h1>
            <p className="page-description">Arquivos disponíveis neste espaço de trabalho.</p>
          </div>
          {!loading && !error && <span className="document-count">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span>}
        </div>
        <UploadComponent onUpload={refreshDocuments} />
        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading"><h2 id="documents-title">Arquivos</h2></div>
          {loading ? (
            <p className="state-message" role="status">Carregando documentos...</p>
          ) : error ? (
            <div className="state-message" role="alert">
              <p>{error}</p>
              <button className="text-button" type="button" onClick={refreshDocuments}>Tentar novamente</button>
            </div>
          ) : (
            <DocumentList documents={documents} />
          )}
        </section>
      </main>
    </div>
  );
}
