/**
 * Podonly - Processo Principal (Main Process) do Electron
 * 
 * Este arquivo inicializa a janela principal do Electron, configura as preferências do navegador,
 * inicializa o banco de dados SQLite local, registra os handlers do IPC e inicia o serviço do WhatsApp.
 * 
 * Desenvolvido como parte do prontuário digital para podologia Podonly.
 */

import { app, shell, BrowserWindow, ipcMain, Menu, MenuItem, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { initWhatsappService } from './whatsappService'
import { startInactivityMonitor } from './authService'
function createWindow(): void {
  // Configuração inicial da janela do aplicativo com isolamento de contexto e sandbox ativados
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Podonly',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  })

  // Configura idioma do corretor ortográfico nativo do Chromium para Português do Brasil
  session.defaultSession.setSpellCheckerLanguages(['pt-BR'])

  // Menu de contexto com sugestões de correção ortográfica e ações de edição
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()

    // Se houver uma palavra com erro ortográfico selecionada
    if (params.misspelledWord) {
      if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(
            new MenuItem({
              label: suggestion,
              click: () => mainWindow.webContents.replaceMisspelling(suggestion)
            })
          )
        }
      } else {
        menu.append(
          new MenuItem({
            label: 'Nenhuma sugestão encontrada',
            enabled: false
          })
        )
      }

      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(
        new MenuItem({
          label: `Adicionar "${params.misspelledWord}" ao dicionário`,
          click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Adiciona opções de edição se for campo de texto ou se houver texto selecionado
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo', label: 'Desfazer' }))
      menu.append(new MenuItem({ role: 'redo', label: 'Refazer' }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ role: 'cut', label: 'Recortar' }))
      menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }))
      menu.append(new MenuItem({ role: 'paste', label: 'Colar' }))
      menu.append(new MenuItem({ role: 'selectAll', label: 'Selecionar tudo' }))
      menu.popup()
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }))
      menu.popup()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Previne navegações inesperadas para URLs externas dentro da janela principal
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Permite apenas navegações dentro da própria aplicação local
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      if (!navigationUrl.startsWith(process.env['ELECTRON_RENDERER_URL'])) {
        event.preventDefault()
      }
    } else {
      if (!navigationUrl.startsWith('file://')) {
        event.preventDefault()
      }
    }
  })

  // Abertura segura de links externos no navegador padrão do sistema operacional
  mainWindow.webContents.setWindowOpenHandler((details) => {
    const allowedDomains = ['accounts.google.com', 'www.googleapis.com', 'wa.me', 'api.whatsapp.com']
    try {
      const urlObj = new URL(details.url)
      if (urlObj.protocol === 'https:' && allowedDomains.includes(urlObj.hostname)) {
        shell.openExternal(details.url)
      }
    } catch (e) {
      console.error('Invalid URL attempt blocked:', details.url)
    }
    return { action: 'deny' }
  })

  startInactivityMonitor(mainWindow)

  // HMR para desenvolvimento ou carrega arquivo local em produção
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Inicialização e configuração do ciclo de vida da aplicação
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  initDatabase()
  registerIpcHandlers()
  initWhatsappService()

  // Atalhos de teclado úteis para desenvolvimento (F12, etc)
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Teste de comunicação IPC básica
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
