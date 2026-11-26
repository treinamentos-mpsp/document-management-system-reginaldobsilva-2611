import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

export default function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p className="state-message">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Nome</th><th>Tamanho</th><th>Enviado em</th><th><span className="sr-only">Ações</span></th></tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="document-name"><span className="file-icon" aria-hidden="true">▤</span><span>{document.originalName}</span></td>
              <td>{formatSize(document.size)}</td>
              <td>{dateFormatter.format(new Date(document.uploadedAt))}</td>
              <td className="action-cell"><DownloadButton document={document} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}