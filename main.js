const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
    title: 'Simple Notes',
    show: false // Don't show until ready
  });

  // Load the HTML file
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development (remove in production)
  // mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          }
        },
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-new-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Current Note',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-current');
          }
        },
        {
          label: 'Export All Notes to Folder',
          click: () => {
            mainWindow.webContents.send('menu-export-all');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Notes from Folder',
          click: () => {
            mainWindow.webContents.send('menu-import-from-disk');
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Notes',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              title: 'Export Notes',
              defaultPath: 'notes-backup.json',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled) {
              mainWindow.webContents.send('menu-export', result.filePath);
            }
          }
        },
        {
          label: 'Import Notes',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Import Notes',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            });

            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const data = await fs.readFile(result.filePaths[0], 'utf8');
                mainWindow.webContents.send('menu-import', data);
              } catch (error) {
                dialog.showErrorBox('Import Error', 'Failed to import notes: ' + error.message);
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for file operations
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get the app data directory for storing notes
ipcMain.handle('get-app-data-path', () => {
  return path.join(app.getPath('userData'), 'notes');
});

// Ensure notes directory exists
ipcMain.handle('ensure-notes-directory', async () => {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    await fs.mkdir(notesPath, { recursive: true });
    return { success: true, path: notesPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save individual note as .txt file
ipcMain.handle('save-note-to-disk', async (event, fileName, content, subfolder = '') => {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes', subfolder);
    await fs.mkdir(notesPath, { recursive: true });
    
    // Sanitize filename
    const sanitizedName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    const filePath = path.join(notesPath, sanitizedName);
    
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export note to user-chosen location
ipcMain.handle('export-note', async (event, fileName, content) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Note',
      defaultPath: fileName,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      await fs.writeFile(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export all notes to a folder
ipcMain.handle('export-all-notes', async (event, fileSystem) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Export Folder',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const exportPath = result.filePaths[0];
      let exportedCount = 0;

      // Create folder structure and export files
      for (const folder of Object.values(fileSystem.folders)) {
        const folderPath = path.join(exportPath, folder.name);
        await fs.mkdir(folderPath, { recursive: true });
      }

      // Export files
      for (const file of Object.values(fileSystem.files)) {
        const sanitizedName = file.name.replace(/[<>:"/\\|?*]/g, '_');
        let filePath;
        
        if (file.folderId && fileSystem.folders[file.folderId]) {
          const folderName = fileSystem.folders[file.folderId].name;
          filePath = path.join(exportPath, folderName, sanitizedName);
        } else {
          filePath = path.join(exportPath, sanitizedName);
        }

        await fs.writeFile(filePath, file.content || '', 'utf8');
        exportedCount++;
      }

      return { success: true, count: exportedCount, path: exportPath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List files in app data directory
ipcMain.handle('list-disk-files', async () => {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    const files = await fs.readdir(notesPath, { withFileTypes: true });
    
    const result = {
      files: [],
      folders: []
    };

    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.txt')) {
        result.files.push(file.name);
      } else if (file.isDirectory()) {
        result.folders.push(file.name);
        // Get files in subfolder
        try {
          const subFiles = await fs.readdir(path.join(notesPath, file.name));
          result.files.push(...subFiles.filter(f => f.endsWith('.txt')).map(f => `${file.name}/${f}`));
        } catch (err) {
          // Ignore subfolder read errors
        }
      }
    }

    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import notes from disk
ipcMain.handle('import-from-disk', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Notes from Folder',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const importPath = result.filePaths[0];
      const importedFiles = [];
      
      async function scanDirectory(dirPath, relativePath = '') {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item.name);
          const relativeItemPath = path.join(relativePath, item.name);
          
          if (item.isFile() && item.name.endsWith('.txt')) {
            const content = await fs.readFile(itemPath, 'utf8');
            importedFiles.push({
              name: item.name,
              content,
              folder: relativePath || null
            });
          } else if (item.isDirectory()) {
            await scanDirectory(itemPath, relativeItemPath);
          }
        }
      }

      await scanDirectory(importPath);
      return { success: true, files: importedFiles };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});