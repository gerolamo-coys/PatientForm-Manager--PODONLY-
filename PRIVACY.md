# Privacy Policy & Patient Data Protection (LGPD / HIPAA Compliance) 📋

[English](#english) | [Português](#português)

---

<a name="english"></a>
## English

### Privacy Philosophy
Podonly was designed from the ground up to respect patient confidentiality and clinical privacy. Unlike traditional cloud-only solutions that store health records on third-party servers, Podonly prioritizes a **local-first, offline-first data architecture**.

### 1. Data Storage & Ownership
- **Local Persistence:** All patient records, clinical history, diagnostic foot drawings, financial transactions, and consultation images are stored strictly on the local machine within an embedded SQLite database and the operating system's designated application storage directory.
- **Data Ownership:** The clinic and healthcare practitioner retain 100% ownership and custody of all clinical data. Podonly does not sell, analyze, or monetize patient data.

### 2. Third-Party Integrations
- **Google Calendar (Optional):** Schedulings synchronized with Google Calendar only transmit appointment titles, scheduled timestamps, and consultation notes directly to the practitioner's configured Google account via official Google APIs.
- **WhatsApp Web (Optional):** Appointment notification messages are sent directly from the practitioner's paired WhatsApp Web session without routing through intermediary messaging brokers.
- **License Validation:** Licensing verification queries only machine hardware identifiers and license keys with the licensing server, never exposing patient records or clinical data.

### 3. Backups and Export
- Practitioners can generate on-demand ZIP backups containing their complete SQLite database and patient images.
- Backups should be stored on encrypted external media or compliant clinical storage according to regional medical retention guidelines.

---

<a name="português"></a>
## Português

### Filosofia de Privacidade e Conformidade (LGPD)
O Podonly foi desenvolvido sob o princípio de privacidade e sigilo médico por padrão. Diferente de sistemas puramente em nuvem que armazenam prontuários em servidores de terceiros, o Podonly adota uma **arquitetura local (*local-first*)**.

### 1. Armazenamento e Custódia dos Dados
- **Armazenamento Local:** Todos os dados cadastrais, fichas de evolução, histórico clínico, mapas desenhados dos pés, fotos de lesões e registros financeiros são gravados exclusivamente no computador local do podólogo, em um banco de dados SQLite local protegido.
- **Titularidade:** A clínica e o profissional de saúde possuem custódia total e irrestrita sobre seus dados. O software Podonly não realiza coleta, mineração ou compartilhamento de dados médicos de pacientes.

### 2. Integrações Opcionais
- **Google Agenda:** A sincronização transmite apenas títulos e horários de consultas diretamente para a conta Google do profissional via API oficial.
- **WhatsApp Web:** O envio de lembretes ocorre diretamente pelo WhatsApp Web do próprio profissional, sem servidores intermediários terceiros.
- **Ativação de Licença:** A validação de licença comunica estritamente a chave do produto e identificadores de hardware da máquina, sem jamais trafegar prontuários ou registros de pacientes.

### 3. Backups e Retenção
- O profissional de saúde pode realizar backups completos a qualquer momento na tela de configurações do sistema, gerando arquivos de segurança com o banco de dados e imagens.
- Recomenda-se manter os backups salvos em mídias criptografadas ou serviços de nuvem seguros para cumprimento das diretrizes de guarda de prontuários.
