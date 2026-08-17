# Estrutura, Copywriting e Design da Landing Page (Clean White / Sky-Blue) - Podonly

Este documento detalha o design visual, copywriting, animações e recursos da landing page oficial do **Podonly** no tema **Clean White e Sky-Blue (Light Mode)**.

---

## 🎨 Visual Preview (Mockup do UI/UX Clean)

![Mockup da Landing Page do Podonly em Light Mode](/C:/Users/germa/.gemini/antigravity/brain/604e803e-c9e7-42b9-87e9-543c15c22639/podonly_clean_landing_page_1781096979649.png)

---

## 💻 Mockup de Dispositivo para a Seção Hero (Laptop Screen)

Para a seção principal (Hero) da landing page, em vez de simular uma tela com CSS, utilize este mockup realístico de laptop contendo a interface do **Podonly** na tela:

![Mockup de Laptop do Podonly](/C:/Users/germa/.gemini/antigravity/brain/604e803e-c9e7-42b9-87e9-543c15c22639/podonly_laptop_mockup_1781120860877.png)

---

## ⚡ Prompts de Design Atualizados (Para ferramentas de IA / Frontend)

Se você for construir a interface utilizando geradores de código (como v0.dev, Bolt.new ou Tailwind Builder), utilize esta especificação de prompt altamente detalhada:

```text
Crie uma landing page de altíssimo nível (SaaS premium) para um aplicativo desktop de podologia chamado 'Podonly'.
A estética deve ser ultra clean em Light Mode:
- Fundo branco puro (#FFFFFF) com gradientes circulares extremamente suaves em tons de azul céu (#E0F2FE) e azul pastel (#BAE6FD).
- Cartões com sombras suaves (box-shadow: 0 10px 30px -10px rgba(14, 165, 233, 0.08)) e bordas arredondadas elegantes.
- Tipografia limpa como 'Outfit' ou 'Inter' com contrastes suaves de cinza escuro para os textos corporativos.
- Seção Hero impactante: Um título forte e moderno como "O prontuário inteligente e a gestão financeira que seu consultório de podologia merece", seguido por dois botões de CTA elegantes ("Começar Teste Grátis" em azul celeste brilhante, e "Agendar Demonstração" em contorno fino azul).
- Destaque da Seção Hero: Inclua uma imagem centralizada representando uma tela de laptop moderna e realista contendo a dashboard do software, flutuando suavemente usando CSS (floating keyframe animation).
- Efeito de animação suave: Fade-in ao rolar a página, transições suaves nos botões com hover scale e transição suave nos cards.
- Grid de recursos com ícones modernos da biblioteca lucide-react para: Ficha de Anamnese, Mapa do Pé Clínico com desenhos, Sincronização de Google Agenda, Lembretes Automáticos por WhatsApp Web, Caixa Financeiro Interativo.
- Tabela de preços clara e moderna destacando o plano anual como a melhor escolha.
```

---

## 🌀 Diretrizes para Animações Suaves (CSS/JS)

### 1. Efeito de Flutuação Suave para o Laptop (Floating Animation)
Para dar vida ao mockup de laptop na seção Hero, utilize esta animação contínua:
```css
@keyframes floatLaptop {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

.laptop-mockup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 3rem;
  animation: floatLaptop 6s ease-in-out infinite;
}

.laptop-mockup-container img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 30px 60px -15px rgba(14, 165, 233, 0.2);
}
```

### 2. Efeito de Entrada Suave (Fade In Up)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-animate {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 3. Micro-Interações nos Cards
```css
.feature-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px -15px rgba(14, 165, 233, 0.15);
}
```

---

## 📑 Copywriting e Estrutura Seção por Seção

### 1. Cabeçalho (Navegação Principal)
* **Logo:** `Podonly` (Texto com gradiente de `#0ea5e9` a `#0284c7`).
* **Menu:** Recursos • Como Funciona • Preços • Contato
* **Botão CTA:** "Baixar App" (Estilo contornado azul com hover suave).

### 2. Seção Hero
* **Headline:** "O prontuário digital e a gestão financeira perfeitos para o podólogo moderno."
* **Sub-headline:** "Desenhe no mapa do pé, sincronize sua agenda com o Google, envie lembretes via WhatsApp e controle seu caixa. Tudo em um único sistema desktop rápido, seguro e sem complicações."
* **Ações (CTAs):**
  * Primária: `Experimentar Grátis por 7 Dias` (Botão azul céu).
  * Secundária: `Ver Como Funciona` (Botão transparente com borda azul).

### 3. Grid de Funcionalidades (Clean Cards)
Apresentação em cards brancos brilhantes com sombras pastéis:
* **Ficha de Anamnese Interativa:** Prontuário focado em podologia, registrando doenças sistêmicas, calçados e formatos de unha.
* **Mapa do Pé Gráfico:** Ferramenta integrada de desenho livre para mapear calosidades, micoses, verrugas e lesões diretamente na ficha do paciente.
* **Lembrete de Consultas via WhatsApp:** Disparo de lembretes automáticos formatados para diminuir o índice de faltas dos pacientes.
* **Módulo Financeiro Integrado:** Fluxo de caixa descomplicado com saldo em tempo real, gráfico do mês e categorias personalizáveis para podólogos.
* **Agenda com Google Calendar:** Sincronização automática para que você veja seus atendimentos pelo celular em qualquer lugar.

### 4. Tabela de Preços (Foco na Conversão)
* **Mensal:** R$ 59,90/mês.
* **Anual (Recomendado):** R$ 499,00/ano (Mais de 30% de desconto, equivalente a R$ 41,58/mês).
* **Incluso em todos:** Suporte por WhatsApp, atualizações automáticas e dados armazenados localmente com backup seguro.
