/**
 * Podonly - Tipos e Interfaces para o Construtor de Mapa dos Pés & Legendas
 */

export type ClinicalSymbolShape =
  | 'star'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'plus'
  | 'cross'
  | 'pin'

export interface ClinicalSymbolDef {
  id: string
  shape: ClinicalSymbolShape
  label: string
  defaultColor: string
  description?: string
}

export interface FeetCanvasTemplateConfig {
  version: number
  backgroundColor: string // Ex: '#ffffff', '#f0fdfa', '#0f172a', '#f8fafc'
  outlineType: 'default' | 'inverted' | 'dual' | 'custom'
  customOutlineBase64?: string
  showGrid: boolean
  gridOpacity: number
  gridSpacing: number
  strokeColor: string
  strokeWidth: number
  symbols: ClinicalSymbolDef[]
}

export interface FootMapSnapshotPayload {
  version: number
  composite: string // Base64 de fundo + marcações combinadas
  drawing: string // Base64 apenas dos traços/marcações
  background?: string // Base64 do fundo ativo no momento da consulta
  symbols?: ClinicalSymbolDef[] // Símbolos e legendas vigentes no momento
  createdAt: string
}

export const DEFAULT_CLINICAL_SYMBOLS: ClinicalSymbolDef[] = [
  { id: 'sym_circle', shape: 'circle', label: 'Calosidade / Calo', defaultColor: '#ef4444' },
  { id: 'sym_star', shape: 'star', label: 'Verruga Plantar', defaultColor: '#f59e0b' },
  { id: 'sym_square', shape: 'square', label: 'Queratose / Hiperqueratose', defaultColor: '#8b5cf6' },
  { id: 'sym_triangle', shape: 'triangle', label: 'Trauma / Lesão Mecânica', defaultColor: '#ec4899' },
  { id: 'sym_diamond', shape: 'diamond', label: 'Onicomicose / Micose', defaultColor: '#06b6d4' },
  { id: 'sym_plus', shape: 'plus', label: 'Calo Interdigital / Úlcera', defaultColor: '#dc2626' },
  { id: 'sym_pin', shape: 'pin', label: 'Ponto de Pressão Excessiva', defaultColor: '#3b82f6' },
  { id: 'sym_cross', shape: 'cross', label: 'Fissura / Rachadura no Calcanhar', defaultColor: '#10b981' }
]

export const DEFAULT_FEET_CANVAS_CONFIG: FeetCanvasTemplateConfig = {
  version: 1,
  backgroundColor: '#ffffff',
  outlineType: 'default',
  showGrid: false,
  gridOpacity: 0.15,
  gridSpacing: 25,
  strokeColor: '#0e91a8',
  strokeWidth: 2,
  symbols: DEFAULT_CLINICAL_SYMBOLS
}
