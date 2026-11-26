import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      await uploadDocument(file);
      setFile(null);
      inputRef.current.value = '';
      setMessage('Documento enviado com sucesso.');
      onUpload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="upload-heading">
        <span className="upload-icon" aria-hidden="true">↑</span>
        <div>
          <h2 id="upload-title">Adicionar documento</h2>
          <p>Selecione um arquivo para enviar.</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <span>Selecionar arquivo</span>
          <input ref={inputRef} type="file" disabled={uploading} onChange={(event) => {
            setFile(event.target.files[0] || null);
            setError('');
            setMessage('');
          }} />
        </label>
        <span className="selected-file" title={file?.name}>{file ? file.name : 'Nenhum arquivo selecionado'}</span>
        <button className="primary-button" type="submit" disabled={!file || uploading}>
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {error && <p className="feedback error" role="alert">{error}</p>}
      {message && <p className="feedback success" role="status">{message}</p>}
    </section>
  );
}