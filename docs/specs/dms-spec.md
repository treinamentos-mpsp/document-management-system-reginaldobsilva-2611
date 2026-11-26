# Especificação - Document Management System

## 1. Objetivo

Entregar um sistema web que permita enviar, listar e baixar documentos, com gestão simples por usuário e armazenamento local no filesystem da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (cada documento pertence a um dono, e a listagem e o download respeitam o dono)

### Fora do escopo

- Armazenamento externo ou em nuvem
- Serviços de upload de terceiros
- Versionamento de documentos
- Autenticação completa (login, senha, tokens, perfis de administrador)
- Exclusão, edição de metadados e compartilhamento entre usuários
- Persistência em banco de dados (nesta fase, metadados ficam em memória)

### Premissas

- O usuário é identificado pelo cabeçalho HTTP `X-User-Id`. Na ausência do cabeçalho, é assumido o valor `anonymous`. Esta é uma identificação simples, não uma autenticação.
- Ao reiniciar a aplicação, os metadados em memória são perdidos. Os arquivos gravados em disco permanecem, mas ficam inacessíveis sem metadados até a fase de persistência.

## 3. Requisitos funcionais

| ID    | Requisito                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento (arquivo único por requisição)                                  |
| RF-02 | O sistema registra os metadados do documento enviado, incluindo o dono identificado pelo `X-User-Id` |
| RF-03 | O usuário pode listar os documentos que lhe pertencem                                              |
| RF-04 | O usuário pode baixar um documento pelo identificador, desde que seja o dono                       |
| RF-05 | O sistema rejeita uploads sem arquivo ou com arquivo acima do tamanho máximo configurado          |
| RF-06 | O sistema responde com erro claro para documentos inexistentes ou de outro dono                    |
| RF-07 | O frontend permite enviar um documento, visualizar a lista e baixar um item da lista               |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                  |
| ------ | ------------------------------------------------------------------------------------------ |
| RNF-01 | Arquivos gravados no filesystem local da aplicação (`backend/storage`) via `multer` com `diskStorage` |
| RNF-02 | Metadados mantidos em memória nesta fase                                                   |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor), por exemplo `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_MB` |
| RNF-04 | Nomes de arquivos gravados no disco são gerados pelo sistema (UUID), nunca o nome enviado pelo cliente |
| RNF-05 | Nenhuma dependência de provedor externo de armazenamento                                   |
| RNF-06 | Backend em Node.js + Express (CommonJS) com testes via `node:test`                         |
| RNF-07 | Frontend em React + Vite (ESM), comunicação via `fetch` com prefixo `/api` (proxy no Vite) |
| RNF-08 | Mensagens ao usuário e comentários em português; símbolos de código em inglês              |

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Descrição                                                        |
| ------------ | ------ | ---------------------------------------------------------------- |
| id           | string | Identificador único do documento (UUID v4)                       |
| originalName | string | Nome original do arquivo enviado, usado apenas na resposta e no download |
| storedName   | string | Nome do arquivo gravado em `STORAGE_DIR` (UUID, interno)         |
| mimeType     | string | Tipo MIME informado no upload                                    |
| size         | number | Tamanho em bytes                                                 |
| uploadedAt   | string | Data/hora do upload (ISO 8601)                                   |
| owner        | string | Identificador do usuário dono (valor de `X-User-Id`)             |

Os metadados são armazenados em um repositório em memória (`Map` indexado por `id`). O campo `storedName` não é exposto na API.

## 6. Contratos de API

Prefixo do backend: sem prefixo no servidor; o frontend acessa via `/api`, que o Vite encaminha para o backend.

Cabeçalho comum: `X-User-Id: <string>` (opcional; padrão `anonymous`).

Formato de erro (todas as respostas de erro):

```json
{ "error": { "code": "CODIGO_DO_ERRO", "message": "Mensagem em português" } }
```

### POST /upload

- Entrada: `multipart/form-data` com o campo `file` (arquivo único)
- Sucesso: `201 Created`

```json
{
  "id": "3f2c1a9e-7b4d-4c1e-9a7e-2d5b8f0c1a11",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 53211,
  "uploadedAt": "2026-11-26T14:30:00.000Z",
  "owner": "user-01"
}
```

- Erros:
  - `400 MISSING_FILE`: campo `file` ausente
  - `413 FILE_TOO_LARGE`: arquivo acima de `MAX_FILE_SIZE_MB`

### GET /documents

- Entrada: cabeçalho `X-User-Id`
- Sucesso: `200 OK` com a lista dos documentos do dono (pode ser vazia)

```json
[
  {
    "id": "3f2c1a9e-7b4d-4c1e-9a7e-2d5b8f0c1a11",
    "originalName": "contrato.pdf",
    "mimeType": "application/pdf",
    "size": 53211,
    "uploadedAt": "2026-11-26T14:30:00.000Z",
    "owner": "user-01"
  }
]
```

### GET /documents/:id/download

- Entrada: parâmetro `id` e cabeçalho `X-User-Id`
- Sucesso: `200 OK` com o conteúdo binário, cabeçalhos `Content-Type` (mimeType) e `Content-Disposition: attachment; filename="<originalName>"`
- Erros:
  - `404 DOCUMENT_NOT_FOUND`: documento inexistente ou pertencente a outro dono (mesma resposta para ambos os casos, para não revelar existência)
  - `404 FILE_NOT_FOUND`: metadados existem, mas o arquivo não está mais no disco

## 7. Arquitetura

### Backend (Clean Architecture simples)

Estrutura prevista em `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada e saída HTTP e validação básica
- `services/`: regras de negócio (dono, limite de tamanho, busca por dono, verificação de acesso)
- `repositories/`: persistência de metadados (memória) e de arquivos (`multer` diskStorage em `STORAGE_DIR`)

Fluxo de dependência: `routes -> controllers -> services -> repositories`. Camadas internas não conhecem Express nem `multer`.

Tratamento de erros: o `multer` e o middleware de erro traduzem falhas para o formato de erro da seção 6, nos limites do sistema (entrada HTTP e I/O de arquivos).

### Frontend

- Componentes funcionais com React Hooks
- Organização em `components/`, `pages/` e `services/` (chamadas `fetch` centralizadas em `services/`)
- Reutilização de componentes para evitar duplicação

### Decisões arquiteturais

- Backend em Clean Architecture simples, sem overengineering
- Armazenamento local apenas, via `multer` com `diskStorage`
- Metadados em memória nesta fase; a troca por persistência é uma evolução futura isolada no repositório
- Identificação de usuário simples por cabeçalho, sem autenticação completa

## 8. Plano de execução

Plano de alto nível. Nenhum arquivo de backend ou frontend é criado nesta etapa; cada etapa abaixo será executada posteriormente.

1. **Configuração do projeto backend**: criar `backend/package.json` com Express e `multer`, definir variáveis de ambiente (`PORT`, `STORAGE_DIR`, `MAX_FILE_SIZE_MB`) e garantir a existência de `backend/storage`.
2. **Repositórios**: implementar o repositório de metadados em memória e o repositório de arquivos com `multer` diskStorage (nomes UUID).
3. **Serviços**: implementar regras de upload (validação de tamanho), listagem por dono e download com verificação de dono.
4. **Controllers e rotas**: implementar `POST /upload`, `GET /documents` e `GET /documents/:id/download` com tratamento de erros no formato da seção 6.
5. **Middleware de identificação e erros**: ler `X-User-Id` (padrão `anonymous`) e padronizar respostas de erro.
6. **Testes do backend**: testes com `node:test` cobrindo upload válido, arquivo ausente, arquivo acima do limite, listagem por dono, download pelo dono e acesso negado a outro dono.
7. **Configuração do frontend**: criar a estrutura Vite + React e o proxy `/api` no `vite.config.js`.
8. **Serviço de API no frontend**: implementar as chamadas `fetch` para upload, listagem e download em `services/`.
9. **Componentes e página principal**: formulário de upload, tabela de documentos e botão de download, com mensagens de erro em português.
10. **Validação final**: executar os testes do backend, testar o fluxo completo manualmente (upload, listagem, download) e revisar a conformidade com as restrições gerais (sem armazenamento externo, Clean Architecture, 12-Factor).

## 9. Critérios de aceite

- Todos os requisitos funcionais RF-01 a RF-07 atendidos
- Arquivos gravados apenas em `STORAGE_DIR` com nomes gerados pelo sistema
- Testes do backend passando com `node:test`
- Nenhuma dependência de armazenamento externo
