# Podonly 🦶🩺

> **Software Moderno de Prontuário Eletrônico (PEP) e Gestão Clínica Especializada para Podologia**  
> *Modern Electronic Health Records (EHR) & Practice Management Software for Podiatrists*

[![CI](https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-/actions/workflows/ci.yml/badge.svg)](https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-/actions/workflows/ci.yml)
[![Licença: Proprietária](https://img.shields.io/badge/Licença-Proprietária-blue.svg)](#licença)
[![Plataforma](https://img.shields.io/badge/Plataforma-Windows-lightgrey.svg)](#requisitos)

🌐 **Idiomas:** [Português (Brasil)](README_PT.md) | [English](README.md)

---

## 🌟 Visão Geral

O **Podonly** é um aplicativo desktop de alto desempenho projetado especificamente para clínicas de podologia e profissionais autônomos. Ele combina prontuário digital completo, mapa visual interativo do pé para diagnóstico, sincronização com o Google Agenda, lembretes automáticos de consulta via WhatsApp e controle financeiro integrado em uma experiência desktop ágil e segura.

---

## 🚀 Principais Funcionalidades

### 📋 1. Prontuário Eletrônico e Anamnese Podológica
- **Cadastro Completo do Paciente:** Registro detalhado com histórico médico, cirúrgico, medicações contínuas, alergias, formato das unhas, tipo de calçado e doenças sistêmicas cruciais para podologia (ex: Diabetes, Hipertensão).
- **Ficha de Evolução:** Registro da queixa principal, evolução dermatológica, procedimentos realizados e prescrições clínicas (*home care*).

### 🎨 2. Mapa do Pé Interativo (Diagnóstico Visual)
- **Marcação Gráfica sobre o Modelo Anatômico:** Desenho e anotação direta em modelos 2D/3D dos pés (vistas plantar e dorsal para os pés direito e esquerdo).
- **Ferramentas com Código de Cores:** Identificação visual de calosidades, verrugas plantares, pontos de pressão, fissuras, onicocriptose e micoses com ajuste de espessura e cores de pincel.
- **Histórico Comparativo:** Cada desenho fica salvo no histórico da consulta, permitindo comparar o antes e depois do tratamento.

### 📅 3. Agenda Inteligente e Integração com Google Calendar
- **Visão Semanal, Mensal e Diária:** Calendário integrado para agendamento rápido e reorganização de horários com arrastar-e-soltar.
- **Sincronização Bidirecional com Google:** Integração com Google Agenda usando transações atômicas SQLite e fluxo seguro OAuth 2.0 com proteção contra ataques CSRF.

### 💬 4. Integração com WhatsApp Web
- **Pareamento Simples via QR Code:** Conexão direta com a sessão do WhatsApp Web.
- **Lembretes Automáticos de Consulta:** Envio com um clique de mensagens personalizadas com confirmação de horário e formatação inteligente de números brasileiros (DDI 55 + DDD + 9 dígitos).

### 💰 5. Gestão de Fluxo de Caixa e Financeiro
- **Lançamentos Ágeis:** Controle de entradas (receitas) e saídas (despesas) com categorias livres e sugestões automáticas por autocompletar.
- **Métricas em Tempo Real:** Resumo instantâneo na tela inicial com total de receitas, despesas e saldo líquido do mês.

### 🔒 6. Segurança Local e Funcionamento Offline
- **Armazenamento Criptografado:** Credenciais e tokens sensíveis do Google são criptografados em repouso usando o cofre nativo do sistema operacional (`safeStorage` do Electron / Windows DPAPI).
- **Banco SQLite de Alta Performance:** Operação local em modo WAL (*Write-Ahead Logging*) para respostas instantâneas sem dependência de internet.
- **Blindagem do Electron:** Isolamento de contexto ativo (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP rigoroso e bloqueador de navegações externas `will-navigate`).
- **Proteção contra *Directory Traversal*:** Leitura e exclusão de fotos confinadas estritamente dentro da pasta de armazenamento autorizada.

---

## 🛠️ Arquitetura e Tecnologias

- **Ambiente Desktop:** [Electron](https://www.electronjs.org/) + [Electron-Vite](https://electron-vite.org/)
- **Interface do Usuário:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Roteamento:** [React Router 7](https://reactrouter.com/)
- **Banco de Dados Local:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite embutido em modo WAL)
- **Estilização:** CSS moderno com efeitos de *glassmorphism*, painéis redimensionáveis e variáveis CSS
- **APIs e Integrações:** Google Calendar API v3, WhatsApp Web.js, Supabase REST

---

## 💻 Começando

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v20.x ou superior recomendado)
- [npm](https://www.npmjs.com/) (v10.x ou superior)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-.git
   cd PatientForm-Manager--PODONLY-
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 📦 Gerando o Instalador de Produção

Para compilar e gerar o instalador executável para Windows (`.exe`):

```bash
# Executa verificação de tipos e compila o instalador Windows
npm run build:win
```

Os executáveis prontos serão gerados na pasta `dist/`.

---

## 🛡️ Segurança e Privacidade (LGPD)

Para informações detalhadas sobre como os dados de saúde dos pacientes, fotos clínicas e credenciais são protegidos localmente em conformidade com as diretrizes de proteção de dados:
- [SECURITY.md](SECURITY.md) — Políticas de segurança e boas práticas.
- [PRIVACY.md](PRIVACY.md) — Princípios de privacidade, retenção de dados e armazenamento local.

---

## 📄 Licença

Software proprietário. Todos os direitos reservados. Desenvolvido para clínicas e profissionais licenciados do Podonly.
