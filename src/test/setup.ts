import { vi, beforeAll, afterAll } from 'vitest'

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name) => {
      if (name === 'userData') return './test-data'
      return './test-data'
    }),
    isPackaged: false,
    quit: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    emit: vi.fn()
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(str, 'utf8')),
    decryptString: vi.fn((buf: Buffer) => buf.toString('utf8'))
  },
  dialog: {
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn()
  },
  shell: {
    openExternal: vi.fn()
  }
}))

beforeAll(() => {
  // setup before all tests
})

afterAll(() => {
  // teardown
})
