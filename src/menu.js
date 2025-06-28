const { Menu, dialog } = require('electron');
const fs = require('fs').promises;

console.log('📋 Menu module loaded successfully');

function createMenu(mainWindow) {
  console.log('🍔 Creating application menu...');
  
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('📄 Menu: New file requested');
            mainWindow.webContents.send('menu-new-file');
          }
        },
        {
          label: 'New Folder', 
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            console.log('📁 Menu: New folder requested');
            mainWindow.webContents.send('menu-new-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Save Current File',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            console.log('💾 Menu: Save requested');
            mainWindow.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Current Note as .txt',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            console.log('📤 Menu: Export current note requested');
            mainWindow.webContents.send('menu-export-current');
          }
        },
        {
          label: 'Export All Notes to Folder',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            console.log('📤 Menu: Export all notes requested');
            mainWindow.webContents.send('menu-export-all');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Notes from Folder',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            console.log('📥 Menu: Import from disk requested');
            mainWindow.webContents.send('menu-import-from-disk');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Database as JSON',
          click: async () => {
            console.log('📋 Menu: JSON export requested');
            try {
              const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Export Notes Database',
                defaultPath: 'simple-notes-backup.json',
                filters: [
                  { name: 'JSON Files', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              });

              if (!result.canceled) {
                mainWindow.webContents.send('menu-export', result.filePath);
              }
            } catch (error) {
              console.error('❌ JSON export dialog failed:', error);
            }
          }
        },
        {
          label: 'Import Database from JSON',
          click: async () => {
            console.log('📋 Menu: JSON import requested');
            try {
              const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Notes Database',
                filters: [
                  { name: 'JSON Files', extensions: ['json'] },
                  { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
              });

              if (!result.canceled && result.filePaths.length > 0) {
                const data = await fs.readFile(result.filePaths[0], 'utf8');
                mainWindow.webContents.send('menu-import', data);
              }
            } catch (error) {
              console.error('❌ JSON import failed:', error);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            console.log('🚪 Menu: Exit requested');
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        { type: 'separator' },
        {
          label: 'Title',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            console.log('$Title$ formatting requested via menu');
            mainWindow.webContents.send('menu-format-title');
          }
        },
        {
          label: 'Subtitle',
          accelerator: 'CmdOrCtrl+J',
          click: () => {
            console.log('$Subtitle$ formatting requested via menu');
            mainWindow.webContents.send('menu-format-subtitle');
          }
        },
        {
          label: 'Bold',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            console.log('**Bold** formatting requested via menu');
            mainWindow.webContents.send('menu-format-bold');
          }
        },
        {
          label: 'Italic',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            console.log('*Italic* formatting requested via menu');
            mainWindow.webContents.send('menu-format-italic');
          }
        },
        {
          label: 'Underline',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            console.log('_Underline_ formatting requested via menu');
            mainWindow.webContents.send('menu-format-underline');
          }
        },
        {
          label: 'Monospace',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            console.log('[Monospace] formatting requested via menu');
            mainWindow.webContents.send('menu-format-monospace');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            console.log('🔄 Menu: Reload requested');
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            console.log('🔄 Menu: Force reload requested');
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            console.log('🔧 Menu: DevTools toggle requested');
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomIn'
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut'
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            console.log('🖥️  Menu: Fullscreen toggle requested');
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Simple Notes',
          click: () => {
            console.log('ℹ️ Menu: About dialog requested');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Simple Notes',
              message: 'Simple Notes v1.0.0',
              detail: 'A fast, lightweight note-taking application with binary storage and real-time markdown formatting.\n\nFeatures:\n• Folder organization\n• Real-time markdown rendering\n• Binary storage for speed\n• Export/import capabilities\n• Keyboard shortcuts\n\nBuilt with Electron and love ❤️',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            console.log('⌨️ Menu: Shortcuts dialog requested');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: 'Simple Notes - Keyboard Shortcuts',
              detail: 'File Operations:\n' +
                      '• Ctrl/Cmd+N - New File\n' +
                      '• Ctrl/Cmd+Shift+N - New Folder\n' +
                      '• Ctrl/Cmd+S - Save Current File\n' +
                      '• Ctrl/Cmd+E - Export Current Note\n' +
                      '• Ctrl/Cmd+I - Import Notes\n\n' +
                      'Text Formatting:\n' +
                      '• Ctrl/Cmd+H - Title ($text$)\n' +
                      '• Ctrl/Cmd+J - Subtitle ($text$)\n' +
                      '• Ctrl/Cmd+B - Bold (**text**)\n' +
                      '• Ctrl/Cmd+I - Italic (*text*)\n' +
                      '• Ctrl/Cmd+U - Underline (_text_)\n' +
                      '• Ctrl/Cmd+M - Monospace ([text])\n\n' +
                      'Other:\n' +
                      '• Double-click - Rename file/folder\n' +
                      '• Right-click - Context menu\n' +
                      '• Drag & drop - Move files to folders',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Simple Notes',
      submenu: [
        {
          label: 'About Simple Notes',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Simple Notes',
              message: 'Simple Notes v1.0.0',
              detail: 'A fast, lightweight note-taking application.',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Hide Simple Notes',
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => mainWindow.close()
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  console.log('✅ Menu created successfully with full feature set');
}

module.exports = { createMenu };