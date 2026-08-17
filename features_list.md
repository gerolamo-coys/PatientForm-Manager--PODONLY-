# Lista Completa de Funcionalidades - Podonly

Este documento detalha todas as funcionalidades integradas no sistema desktop **Podonly**, projetado especificamente para podólogos gerenciarem suas clínicas de forma eficiente, segura e profissional.

---

## 1. Cadastro e Ficha de Pacientes (Prontuário Digital)
* **Informações Detalhadas:** Cadastro completo com nome, data de nascimento, telefone, endereço, profissão, prática de esportes e hábitos de calçado.
* **Histórico Clínico Completo (Anamnese):**
  * Antecedentes médicos e cirúrgicos.
  * Medicamentos em uso e alergias catalogadas.
  * Problemas de saúde sistêmicos (como diabetes e hipertensão, cruciais para a podologia).
  * Formato da unha e tipo de calçado habitual.
* **Histórico de Consultas:** Registro de múltiplos formulários de histórico clínico vinculados a cada paciente ao longo do tempo.

---

## 2. Formulários Clínicos e Mapa do Pé (Diagnóstico Visual)
* **Ficha de Evolução:** Registro da queixa principal, evolução dermatológica e prescrição clínica de cada sessão.
* **Mapa do Pé Interativo:**
  * Desenho e marcação visual interativa sobre um modelo tridimensional/2D do pé (esquerdo e direito, sola e dorso).
  * Permite ao podólogo desenhar livremente com cores e espessuras de pincel diferentes para marcar calosidades, verrugas plantares, pontos de pressão, fissuras ou infecções.
  * Salvamento seguro das anotações gráficas diretamente associadas à sessão do paciente.

---

## 3. Agenda e Calendário Inteligente
* **Visualização Semanal/Mensal/Diária:** Calendário integrado para agendamento de consultas.
* **Fácil Manipulação:** Interface de arrastar-e-soltar ou clique rápido para criar, editar ou reagendar compromissos.
* **Integração Google Calendar:**
  * Sincronização automática em tempo real com o Google Calendar.
  * Notificações de consultas criadas localmente sincronizadas com a nuvem do Google de forma transparente.

---

## 4. Integração com WhatsApp Web (Lembretes Automáticos)
* **Conexão via QR Code:** Autenticação direta e segura no WhatsApp Web através de leitura de QR Code na dashboard do sistema.
* **Envio de Lembretes de Consulta:**
  * Envio automatizado ou com um clique para confirmar agendamentos com pacientes.
  * Formatação inteligente de números brasileiros (correção de DDI 55, DDD e dígito 9).
  * Mensagens personalizadas com o nome do paciente, data e hora da consulta.

---

## 5. Módulo Financeiro
* **Gestão de Fluxo de Caixa:** Lançamento rápido de receitas (entradas) e despesas (saídas).
* **Filtros Temporais:** Seleção dinâmica por mês e ano para exibição e cálculo automático do saldo.
* **Cards de Resumo no Dashboard:** Painel visual na tela inicial que exibe Receitas, Despesas e Saldo Líquido atualizados instantaneamente.
* **Categorias Livres com Autocompletar:** Flexibilidade total para digitar qualquer categoria (ex: "Bisturis", "Consulta Retorno", "Aluguel"). O sistema sugere termos digitados anteriormente para agilizar a inserção.
* **Associação Opcional:** Integração opcional de transações a atendimentos ou pacientes específicos.

---

## 6. Segurança e Ativação de Licenças (Anti-Pirataria)
* **Ativação por Chave (Licença):** Bloqueio inicial do sistema exigindo uma chave válida.
* **Hardware Locking (Machine ID):** 
  * A licença fica vinculada exclusivamente à máquina física do usuário através de um identificador único de hardware.
  * Impede o compartilhamento não autorizado ou pirataria da mesma chave de licença em múltiplos computadores.
* **Integração Supabase:** Validação robusta de licenças via banco de dados online seguro em tempo real.
