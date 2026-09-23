/**
 * Podonly - Módulo de Idioma e Dicionário Português do Brasil (pt-BR)
 * 
 * Fornece dicionário clínico/geral expandido e um motor dinâmico de regras gramaticais
 * de sufixos em Português para correção automática de acentuação e erros de digitação.
 */

/**
 * Mapeamento direto para palavras curtas, irregulares, termos clínicos e podológicos
 */
const PT_BR_DIRECT_DICT: Record<string, string> = {
  // Palavras funcionais e curtas
  nao: 'não',
  voce: 'você',
  voces: 'vocês',
  tambem: 'também',
  ate: 'até',
  esta: 'está',
  estao: 'estão',
  sao: 'são',
  ja: 'já',
  la: 'lá',
  ha: 'há',
  entao: 'então',
  que: 'que',
  para: 'para',
  como: 'como',
  mais: 'mais',
  mas: 'mas',
  sem: 'sem',
  com: 'com',

  // Podologia, Anatomia e Saúde
  pe: 'pé',
  pes: 'pés',
  halux: 'hálux',
  calcaneo: 'calcâneo',
  metatarso: 'metatarso',
  falange: 'falange',
  fascite: 'fascite',
  calosidade: 'calosidade',
  onicocriptose: 'onicocriptose',
  onicomicose: 'onicomicose',
  paroniquia: 'paroníquia',
  palmilha: 'palmilha',
  verruga: 'verruga',
  saude: 'saúde',
  historico: 'histórico',
  clinica: 'clínica',
  medico: 'médico',
  medica: 'médica',
  medicos: 'médicos',
  medicas: 'médicas',
  farmacia: 'farmácia',
  remedio: 'remédio',
  remedios: 'remédios',
  diabetico: 'diabético',
  diabetica: 'diabética',
  diabetes: 'diabetes',
  anestesia: 'anestesia',
  alergia: 'alergia',
  acido: 'ácido',
  fisico: 'físico',
  fisica: 'física',
  quimico: 'químico',
  quimica: 'química',
  bactericida: 'bactericida',
  germicida: 'germicida',
  esterilizacao: 'esterilização',
  curativo: 'curativo',
  curativos: 'curativos',
  sangramento: 'sangramento',
  inflamacao: 'inflamação',
  infeccao: 'infecção',
  fungica: 'fúngica',
  bacteriana: 'bacteriana',

  // Tempo, Datas e Números
  inicio: 'início',
  horario: 'horário',
  horarios: 'horários',
  periodo: 'período',
  periodos: 'períodos',
  numero: 'número',
  numeros: 'números',
  proximo: 'próximo',
  proxima: 'próxima',
  ultimo: 'último',
  ultima: 'última',
  rapido: 'rápido',
  rapida: 'rápida',
  facil: 'fácil',
  dificil: 'difícil',
  duvida: 'dúvida',
  duvidas: 'dúvidas',
  agua: 'água',
  oleo: 'óleo',
  semana: 'semana',
  semanas: 'semanas',
  segunda: 'segunda',
  terca: 'terça',
  quarta: 'quarta',
  quinta: 'quinta',
  sexta: 'sexta',
  sabado: 'sábado',
  domingo: 'domingo',
  mes: 'mês',
  meses: 'meses',
  ano: 'ano',
  anos: 'anos',
  hoje: 'hoje',
  amanha: 'amanhã',

  // Erros comuns de digitação
  pacientte: 'paciente',
  piente: 'paciente',
  atenddimento: 'atendimento',
  consultta: 'consulta'
}

/**
 * Motor de sufixos gramaticais da língua portuguesa.
 * Identifica padrões regulares de acentuação como -ção, -ções, -são, -sões, -ário, -ância, -ência, -vel, -tico, -logo, etc.
 */
function applyGrammaticalSuffixRules(lowerWord: string): string | null {
  const len = lowerWord.length

  // Palavras com final -cao -> -ção (ex: infeccao -> infecção, orientacao -> orientação)
  if (len > 3 && lowerWord.endsWith('cao') && !lowerWord.endsWith('rcao')) {
    return lowerWord.slice(0, -3) + 'ção'
  }

  // Palavras com final -coes -> -ções (ex: alteracoes -> alterações, instrucoes -> instruções)
  if (len > 4 && lowerWord.endsWith('coes')) {
    return lowerWord.slice(0, -4) + 'ções'
  }

  // Palavras com final -sao -> -são (ex: sessao -> sessão, pressao -> pressão, lesao -> lesão)
  if (len > 3 && lowerWord.endsWith('sao')) {
    return lowerWord.slice(0, -3) + 'são'
  }

  // Palavras com final -soes -> -sões (ex: sessoes -> sessões, pressoes -> pressões)
  if (len > 4 && lowerWord.endsWith('soes')) {
    return lowerWord.slice(0, -4) + 'sões'
  }

  // Sufixos -ario / -aria -> -ário / -ária (ex: prontuario -> prontuário, horario -> horário)
  if (len > 4 && lowerWord.endsWith('ario')) {
    return lowerWord.slice(0, -4) + 'ário'
  }
  if (len > 4 && lowerWord.endsWith('aria') && !['mafia', 'bateria'].includes(lowerWord)) {
    return lowerWord.slice(0, -4) + 'ária'
  }
  if (len > 5 && lowerWord.endsWith('arios')) {
    return lowerWord.slice(0, -5) + 'ários'
  }
  if (len > 5 && lowerWord.endsWith('arias')) {
    return lowerWord.slice(0, -5) + 'árias'
  }

  // Sufixos -ncia / -ncias -> -ncia / -ncias (ex: frequencia -> frequência, urgencia -> urgência)
  if (len > 4 && lowerWord.endsWith('ncia')) {
    return lowerWord.slice(0, -4) + 'ncia'
  }
  if (len > 5 && lowerWord.endsWith('ncias')) {
    return lowerWord.slice(0, -5) + 'ncias'
  }

  // Sufixos -vel / -veis -> -vel / -veis (ex: responsavel -> responsável, disponivel -> disponível)
  if (len > 4 && lowerWord.endsWith('vel')) {
    return lowerWord.slice(0, -3) + 'vel'
  }
  if (len > 5 && lowerWord.endsWith('veis')) {
    return lowerWord.slice(0, -4) + 'veis'
  }

  // Sufixos -tico / -tica -> -tico / -tica (ex: diagnostico -> diagnóstico, estetico -> estético)
  if (len > 4 && lowerWord.endsWith('tico')) {
    return lowerWord.slice(0, -4) + 'tico'
  }
  if (len > 4 && lowerWord.endsWith('tica')) {
    return lowerWord.slice(0, -4) + 'tica'
  }
  if (len > 5 && lowerWord.endsWith('ticos')) {
    return lowerWord.slice(0, -5) + 'ticos'
  }
  if (len > 5 && lowerWord.endsWith('ticas')) {
    return lowerWord.slice(0, -5) + 'ticas'
  }

  // Sufixos -amico / -amica -> -âmico / -êmica (ex: anatomico -> anatômico)
  if (len > 5 && lowerWord.endsWith('amico')) {
    return lowerWord.slice(0, -5) + 'âmico'
  }
  if (len > 5 && lowerWord.endsWith('amica')) {
    return lowerWord.slice(0, -5) + 'âmica'
  }

  // Sufixos -logo / -loga -> -logo / -loga (ex: podologo -> podólogo, podologa -> podóloga)
  if (len > 5 && lowerWord.endsWith('logo')) {
    return lowerWord.slice(0, -4) + 'logo'
  }
  if (len > 5 && lowerWord.endsWith('loga')) {
    return lowerWord.slice(0, -4) + 'loga'
  }

  return null
}

/**
 * Preserva a caixa de texto original (caixa alta, título ou caixa baixa)
 */
export function preserveCasing(original: string, replacement: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase()
  }
  if (original.charAt(0) === original.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

/**
 * Função principal para obter a palavra corrigida em Português do Brasil.
 * Retorna a palavra corrigida (preservando maiúsculas) ou null se não houver alteração.
 */
export function getPortugueseCorrection(rawWord: string): string | null {
  if (!rawWord || rawWord.length < 1) return null

  const lower = rawWord.toLowerCase()

  // 1. Consulta no dicionário direto
  const directMatch = PT_BR_DIRECT_DICT[lower]
  if (directMatch && directMatch.toLowerCase() !== lower) {
    return preserveCasing(rawWord, directMatch)
  }

  // 2. Aplica regras gramaticais de sufixos do Português
  const ruleMatch = applyGrammaticalSuffixRules(lower)
  if (ruleMatch && ruleMatch.toLowerCase() !== lower) {
    return preserveCasing(rawWord, ruleMatch)
  }

  return null
}
