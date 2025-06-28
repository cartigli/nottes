/**
 * File Handlers - All IPC handlers for file operations
 * Handles binary storage, import/export, and filesystem operations
 */

const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { BinaryNoteFormat } = require('./binary-format');

console.log('📁 File handlers module loaded successfully');

/**
 * Register all IPC handlers for file operations
 */
function registerFileHandlers() {
  console.log('🔧 Registering file operation handlers...');
  
  // Basic file operations
  ipcMain.handle('save-file', handleSaveFile);
  ipcMain.handle('load-file', handleLoadFile);
  
  // Directory operations
  ipcMain.handle('get-app-data-path', handleGetAppDataPath);
  ipcMain.handle('ensure-notes-directory', handleEnsureNotesDirectory);
  
  // Binary operations (high performance)
  ipcMain.handle('save-note-to-disk', handleSaveNoteToDisk);
  ipcMain.handle('save-filesystem-binary', handleSaveFilesystemBinary);
  ipcMain.handle('load-filesystem-binary', handleLoadFilesystemBinary);
  ipcMain.handle('batch-save-notes', handleBatchSaveNotes);
  
  // Export operations
  ipcMain.handle('export-note', handleExportNote);
  ipcMain.handle('export-all-notes', handleExportAllNotes);
  
  // Import operations
  ipcMain.handle('import-from-disk', handleImportFromDisk);
  ipcMain.handle('list-disk-files', handleListDiskFiles);
  
  console.log('✅ All file handlers registered successfully');
}

// Basic file operations
async function handleSaveFile(event, filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`💾 Saved file: ${path.basename(filePath)}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Save failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleLoadFile(event, filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`📖 Loaded file: ${path.basename(filePath)}`);
    return { success: true, content };
  } catch (error) {
    console.error(`❌ Load failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Directory operations
function handleGetAppDataPath() {
  const notesPath = path.join(app.getPath('userData'), 'notes');
  console.log(`📂 App data path: ${notesPath}`);
  return notesPath;
}

async function handleEnsureNotesDirectory() {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    await fs.mkdir(notesPath, { recursive: true });
    console.log(`📁 Notes directory ready: ${notesPath}`);
    return { success: true, path: notesPath };
  } catch (error) {
    console.error(`❌ Directory creation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Binary operations
async function handleSaveNoteToDisk(event, fileName, content, subfolder = '') {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes', subfolder);
    await fs.mkdir(notesPath, { recursive: true });
    
    const sanitizedName = sanitizeFileName(fileName) + BinaryNoteFormat.getExtension();
    const filePath = path.join(notesPath, sanitizedName);
    
    const binaryData = BinaryNoteFormat.serializeNote(content);
    await fs.writeFile(filePath, binaryData);
    console.log(`⚡ Binary note saved: ${sanitizedName}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error(`❌ Binary save failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleSaveFilesystemBinary(event, fileSystem) {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    await fs.mkdir(notesPath, { recursive: true });
    
    const filePath = path.join(notesPath, `.filesystem${BinaryNoteFormat.getFilesystemExtension()}`);
    const binaryData = BinaryNoteFormat.serialize(fileSystem);
    await fs.writeFile(filePath, binaryData);
    console.log(`⚡ Filesystem saved in binary format`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error(`❌ Filesystem binary save failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleLoadFilesystemBinary() {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    const filePath = path.join(notesPath, `.filesystem${BinaryNoteFormat.getFilesystemExtension()}`);
    
    const binaryData = await fs.readFile(filePath);
    const fileSystem = BinaryNoteFormat.deserialize(binaryData);
    console.log(`⚡ Filesystem loaded from binary format`);
    return { success: true, fileSystem };
  } catch (error) {
    console.log(`📦 No binary filesystem found (normal for first run)`);
    return { success: false, error: error.message };
  }
}

async function handleBatchSaveNotes(event, fileSystem) {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    await fs.mkdir(notesPath, { recursive: true });
    
    const operations = [];
    
    // Save main filesystem
    operations.push(
      fs.writeFile(
        path.join(notesPath, `.filesystem${BinaryNoteFormat.getFilesystemExtension()}`),
        BinaryNoteFormat.serialize(fileSystem)
      )
    );
    
    // Save individual notes in parallel
    for (const file of Object.values(fileSystem.files)) {
      const folderPath = file.folderId && fileSystem.folders[file.folderId] 
        ? fileSystem.folders[file.folderId].name 
        : '';
      const noteDir = path.join(notesPath, folderPath);
      const sanitizedName = sanitizeFileName(file.name) + BinaryNoteFormat.getExtension();
      const filePath = path.join(noteDir, sanitizedName);
      
      operations.push(
        fs.mkdir(noteDir, { recursive: true })
          .then(() => fs.writeFile(filePath, BinaryNoteFormat.serializeNote(file.content)))
      );
    }
    
    // Execute all operations in parallel for maximum speed
    await Promise.all(operations);
    const fileCount = Object.keys(fileSystem.files).length;
    console.log(`⚡ Batch saved ${fileCount} notes in binary format`);
    return { success: true, count: fileCount };
  } catch (error) {
    console.error(`❌ Batch save failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Export operations
async function handleExportNote(event, fileName, content) {
  try {
    const { mainWindow } = require('../main');
    const result = await dialog.showSaveDialog(mainWindow(), {
      title: 'Export Note',
      defaultPath: fileName.replace(/\.snote$/, '.txt'),
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      await fs.writeFile(result.filePath, content, 'utf8');
      console.log(`📤 Exported note: ${path.basename(result.filePath)}`);
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error(`❌ Export failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleExportAllNotes(event, fileSystem) {
  try {
    const { mainWindow } = require('../main');
    const result = await dialog.showOpenDialog(mainWindow(), {
      title: 'Select Export Folder',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const exportPath = result.filePaths[0];
      const operations = [];

      // Create folder structure
      for (const folder of Object.values(fileSystem.folders)) {
        const folderPath = path.join(exportPath, folder.name);
        operations.push(fs.mkdir(folderPath, { recursive: true }));
      }

      // Export files as .txt
      for (const file of Object.values(fileSystem.files)) {
        const sanitizedName = sanitizeFileName(file.name, '.txt');
        let filePath;
        
        if (file.folderId && fileSystem.folders[file.folderId]) {
          const folderName = fileSystem.folders[file.folderId].name;
          filePath = path.join(exportPath, folderName, sanitizedName);
        } else {
          filePath = path.join(exportPath, sanitizedName);
        }

        operations.push(fs.writeFile(filePath, file.content || '', 'utf8'));
      }

      await Promise.all(operations);
      const fileCount = Object.keys(fileSystem.files).length;
      console.log(`📤 Exported ${fileCount} notes to: ${exportPath}`);
      return { success: true, count: fileCount, path: exportPath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error(`❌ Export all failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Import operations
async function handleImportFromDisk() {
  try {
    const { mainWindow } = require('../main');
    const result = await dialog.showOpenDialog(mainWindow(), {
      title: 'Import Notes from Folder',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const importPath = result.filePaths[0];
      const importedFiles = [];
      
      await scanDirectoryForNotes(importPath, '', importedFiles);
      console.log(`📥 Found ${importedFiles.length} importable files`);
      return { success: true, files: importedFiles };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error(`❌ Import failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleListDiskFiles() {
  try {
    const notesPath = path.join(app.getPath('userData'), 'notes');
    const files = await fs.readdir(notesPath, { withFileTypes: true });
    
    const result = { files: [], folders: [] };

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(BinaryNoteFormat.getExtension())) {
        result.files.push(file.name);
      } else if (file.isDirectory()) {
        result.folders.push(file.name);
        try {
          const subFiles = await fs.readdir(path.join(notesPath, file.name));
          result.files.push(
            ...subFiles
              .filter(f => f.endsWith(BinaryNoteFormat.getExtension()))
              .map(f => `${file.name}/${f}`)
          );
        } catch (err) {
          // Ignore subfolder read errors
        }
      }
    }

    console.log(`📋 Listed ${result.files.length} disk files`);
    return { success: true, ...result };
  } catch (error) {
    console.error(`❌ List disk files failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Helper functions
function sanitizeFileName(fileName, extension = '') {
  const sanitized = fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\.txt$/, '').replace(/\.snote$/, '');
  return sanitized + extension;
}

async function scanDirectoryForNotes(dirPath, relativePath, importedFiles) {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    const relativeItemPath = path.join(relativePath, item.name);
    
    if (item.isFile()) {
      let content;
      let fileName = item.name;
      
      if (item.name.endsWith(BinaryNoteFormat.getExtension())) {
        // Binary format
        const binaryData = await fs.readFile(itemPath);
        content = BinaryNoteFormat.deserializeNote(binaryData);
        fileName = item.name.replace(/\.snote$/, '.txt');
      } else if (item.name.endsWith('.txt')) {
        // Text format
        content = await fs.readFile(itemPath, 'utf8');
      } else {
        continue; // Skip other file types
      }
      
      importedFiles.push({
        name: fileName,
        content,
        folder: relativePath || null
      });
    } else if (item.isDirectory()) {
      await scanDirectoryForNotes(itemPath, relativeItemPath, importedFiles);
    }
  }
}

module.exports = { registerFileHandlers };