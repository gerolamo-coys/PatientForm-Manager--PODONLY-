/**
 * Podonly - Processo Principal (Main Process) do Electron
 * 
 * Este arquivo inicializa a janela principal do Electron, configura as preferências do navegador,
 * inicializa o banco de dados SQLite local, registra os handlers do IPC e inicia o serviço do WhatsApp.
 * 
 * Desenvolvido como parte do prontuário digital para podologia Podonly.
 */

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { initWhatsappService } from './whatsappService'

function createWindow(): void {
  // Configuração inicial da janela do aplicativo
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Podonly',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

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
