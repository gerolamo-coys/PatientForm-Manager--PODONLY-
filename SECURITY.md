# Security Policy / Política de Segurança 🛡️

[English](#english) | [Português](#português)

---

<a name="english"></a>
## English

### Security Overview
Podonly is built as an offline-first Electronic Health Record (EHR) desktop application. Because it processes sensitive medical and clinical records, the application adheres to strict security principles across all layers:

1. **Electron Hardening & Context Isolation:**
   - The rendering process operates in full isolation (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
   - Communication between the renderer and Node.js backend occurs exclusively through a strongly typed, validated IPC preload bridge (`contextBridge.exposeInMainWorld`).
   - Arbitrary renderer navigation is blocked via the `will-navigate` lifecycle listener.
   - All external link openings (`openExternalBrowser` and `setWindowOpenHandler`) strictly enforce the `https:` / `http:` protocol and reject dangerous custom URI schemes (`file:`, `javascript:`, `data:`).

2. **Credentials & Token Protection:**
   - Sensitive credentials and OAuth refresh tokens (e.g., Google Calendar credentials) are encrypted at rest using Electron's native `safeStorage` API, leveraging the operating system's native hardware/user keychain (Windows DPAPI, macOS Keychain).
   - Plaintext tokens are never persisted in unencrypted database fields.

3. **File System & Directory Traversal Protection:**
   - Image file operations (`readPatientImageBase64`, `deletePatientImage`) enforce `path.basename` sanitization and directory confinement verification (`isSafeFilePath`) to prevent path traversal (`../../`) vulnerabilities.
   - File uploads enforce a strict 10 MB size limit and restrict allowed extensions to verified image formats (`.jpg`, `.jpeg`, `.png`, `.webp`).

4. **OAuth 2.0 CSRF Protection:**
   - Google Calendar authorization generates a cryptographically random `state` parameter using `crypto.randomBytes(32)` that is verified upon callback completion before token exchange.

### Reporting a Vulnerability
If you discover any security issues or vulnerabilities within Podonly, please do not open a public GitHub issue. Instead, contact the maintainers directly via email. Security reports will be reviewed and addressed with high priority.

---

<a name="português"></a>
## Português

### Visão Geral de Segurança
O Podonly é desenvolvido como um prontuário eletrônico desktop de alta privacidade (*offline-first*). Como processa dados médicos e registros clínicos de pacientes, a aplicação segue rigorosos padrões de segurança:

1. **Blindagem do Electron e Isolamento de Contexto:**
   - O processo de renderização da interface opera em isolamento total (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
   - Toda comunicação entre a interface visual e o processo do Node.js ocorre exclusivamente através de uma ponte IPC segura e pré-validada via `contextBridge.exposeInMainWorld`.
   - Navegações externas não autorizadas são bloqueadas pelo evento `will-navigate`.
   - Abertura de links externos é validada para permitir apenas protocolos seguros (`https:` / `http:`), bloqueando protocolos perigosos (`file:`, `javascript:`, `data:`).

2. **Proteção de Tokens e Credenciais:**
   - Tokens de autorização e credenciais do Google Calendar são criptografados em repouso no SQLite local utilizando a API nativa `safeStorage` do Electron (Windows DPAPI / macOS Keychain).

3. **Proteção de Sistema de Arquivos (*Directory Traversal*):**
   - A leitura e exclusão de fotos utiliza sanitização de caminhos (`path.basename`) e verificação de limites de diretório para garantir que nenhum arquivo fora da pasta de imagens possa ser acessado ou modificado.
   - Uploads possuem limite máximo estrito de 10 MB e validação de extensão (`.jpg`, `.jpeg`, `.png`, `.webp`).

4. **Proteção Anti-CSRF no OAuth:**
   - A sincronização com o Google Agenda valida tokens criptográficos aleatórios `state` para garantir que o fluxo de autorização não possa ser interceptado ou falsificado.

### Reportando Vulnerabilidades
Se você identificar qualquer vulnerabilidade de segurança no Podonly, por favor não abra uma issue pública no GitHub. Entre em contato diretamente com a equipe de desenvolvimento para que a correção seja desenvolvida e aplicada prioritariamente.
