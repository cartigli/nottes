/**
 * Renderer Process - Main application logic for Simple Notes
 * Handles UI interactions, file management, and Electron integration
 */

// Application state
let fileSystem = {
    folders: {},
    files: {}
};
let currentFileId = null;
let draggedItem = null;
let contextMenu = null;
let autoSaveTimeout = null;
let isElectron = typeof require !== 'undefined';

// Initialize the application
async function init() {
    console.log('🚀 Initializing Simple Notes...');
    
    // Load data in correct order
    loadFromLocalStorage();
    
    if (isElectron) {
        await loadFromBinary();
    }
    
    // Render UI after data is loaded
    renderFileTree();
    setupEventListeners();
    
    console.log('✅ Simple Notes initialized successfully');
}

// Event listeners setup
function setupEventListeners() {
    const editor = document.getElementById('textEditor');
    const preview = document.getElementById('formattedPreview');
    
    // Text editing and formatting
    editor.addEventListener('input', () => {
        MarkdownFormatter.updateFormattedPreview(editor, preview);
        updateSyncStatus('saving');
        
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveCurrentFile();
            // Only auto-save to disk when we have a current file for text changes
            if (currentFileId) {
                autoSaveToDisk();
            }
        }, 500);
    });

    // Setup markdown formatting and scroll sync
    MarkdownFormatter.setupScrollSync(editor, preview);
    MarkdownFormatter.addKeyboardShortcuts(editor);
    
    // Context menu handling
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.tree-item')) {
            hideContextMenu();
        }
    });

    // Initialize Electron integration
    if (isElectron) {
        setupElectronIntegration();
    }
}

// File system operations
function createFolder() {
    const id = 'folder_' + Date.now();
    fileSystem.folders[id] = {
        id: id,
        name: 'New Folder',
        files: []
    };
    renderFileTree();
    saveToLocalStorage();
    
    // Save new folder to disk immediately
    saveFilesystemToDisk();
    
    setTimeout(() => editName(id, 'folder'), 100);
}

function createFile() {
    const id = 'file_' + Date.now();
    fileSystem.files[id] = {
        id: id,
        name: 'New File.txt',
        content: '',
        folderId: null
    };
    renderFileTree();
    saveToLocalStorage();
    
    // Save new file to disk immediately
    saveFilesystemToDisk();
    
    setTimeout(() => editName(id, 'file'), 100);
}

function openFile(fileId) {
    saveCurrentFile();
    
    currentFileId = fileId;
    const file = fileSystem.files[fileId];
    
    document.getElementById('currentFileName').textContent = file.name;
    document.getElementById('emptyState').style.display = 'none';
    
    const editorContainer = document.getElementById('editorContainer');
    const editor = document.getElementById('textEditor');
    const preview = document.getElementById('formattedPreview');
    
    editorContainer.style.display = 'block';
    editor.value = file.content;
    MarkdownFormatter.updateFormattedPreview(editor, preview);
    editor.focus();

    renderFileTree(); // Refresh to show selection
}

function saveCurrentFile() {
    if (currentFileId) {
        const editor = document.getElementById('textEditor');
        fileSystem.files[currentFileId].content = editor.value;
        saveToLocalStorage();
        updateSyncStatus('saved');
    }
}

function deleteItem(id, type) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
        return;
    }
    
    if (type === 'folder') {
        // Move all files in folder to root
        Object.values(fileSystem.files)
            .filter(file => file.folderId === id)
            .forEach(file => file.folderId = null);
        delete fileSystem.folders[id];
    } else {
        if (id === currentFileId) {
            currentFileId = null;
            document.getElementById('currentFileName').textContent = 'Select a file to edit';
            document.getElementById('emptyState').style.display = 'flex';
            document.getElementById('editorContainer').style.display = 'none';
        }
        delete fileSystem.files[id];
    }
    
    hideContextMenu();
    renderFileTree();
    saveToLocalStorage();
    
    // CRITICAL: Save deletions to disk immediately
    saveFilesystemToDisk();
}

// UI rendering
function renderFileTree() {
    const tree = document.getElementById('fileTree');
    tree.innerHTML = '';

    console.log('🌳 Rendering file tree...');
    console.log('Folders:', Object.keys(fileSystem.folders).length);
    console.log('Files:', Object.keys(fileSystem.files).length);

    // Render root level folders first
    Object.values(fileSystem.folders).forEach(folder => {
        console.log('📁 Adding folder:', folder.name);
        tree.appendChild(createFolderElement(folder));
    });

    // Render root level files
    const rootFiles = Object.values(fileSystem.files).filter(file => !file.folderId);
    rootFiles.forEach(file => {
        console.log('📄 Adding root file:', file.name);
        tree.appendChild(createFileElement(file));
    });
    
    console.log('✅ File tree rendered');
}

function createFolderElement(folder) {
    // Create the main folder element
    const folderDiv = document.createElement('div');
    folderDiv.className = 'tree-item folder';
    folderDiv.draggable = true;
    folderDiv.dataset.id = folder.id;
    folderDiv.dataset.type = 'folder';
    
    folderDiv.innerHTML = `<span class="name">${folder.name}</span>`;

    setupItemEvents(folderDiv);

    // Create container that holds both folder and its files
    const folderContainer = document.createElement('div');
    folderContainer.className = 'folder-container';
    folderContainer.appendChild(folderDiv);

    // Add folder files underneath
    const folderFiles = Object.values(fileSystem.files).filter(file => file.folderId === folder.id);
    folderFiles.forEach(file => {
        const fileElement = createFileElement(file);
        fileElement.classList.add('nested-file');
        folderContainer.appendChild(fileElement);
    });

    return folderContainer;
}

function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'tree-item file';
    div.draggable = true;
    div.dataset.id = file.id;
    div.dataset.type = 'file';
    
    div.innerHTML = `<span class="name">${file.name}</span>`;

    if (file.id === currentFileId) {
        div.classList.add('selected');
    }

    setupItemEvents(div);
    return div;
}

function setupItemEvents(element) {
    // Click to select/open
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        if (element.dataset.type === 'file') {
            openFile(element.dataset.id);
        }
    });

    // Double click to rename
    element.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editName(element.dataset.id, element.dataset.type);
    });

    // Right click for context menu
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, element.dataset.id, element.dataset.type);
    });

    // Drag and drop
    element.addEventListener('dragstart', (e) => {
        draggedItem = {
            id: element.dataset.id,
            type: element.dataset.type
        };
    });

    element.addEventListener('dragover', (e) => {
        if (element.dataset.type === 'folder' && draggedItem && draggedItem.id !== element.dataset.id) {
            e.preventDefault();
            element.classList.add('drag-over');
        }
    });

    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        if (element.dataset.type === 'folder' && draggedItem) {
            moveItem(draggedItem.id, draggedItem.type, element.dataset.id);
        }
    });
}

function moveItem(itemId, itemType, targetFolderId) {
    if (itemType === 'file') {
        fileSystem.files[itemId].folderId = targetFolderId;
        renderFileTree();
        saveToLocalStorage();
        
        // Save drag & drop moves to disk immediately
        saveFilesystemToDisk();
    }
}

// Context menu
function showContextMenu(e, id, type) {
    hideContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    
    menu.innerHTML = `
        <div class="context-menu-item" onclick="editName('${id}', '${type}')">Rename</div>
        ${type === 'file' ? `<div class="context-menu-item" onclick="exportNote('${id}')">Export as .txt</div>` : ''}
        <div class="context-menu-item" onclick="deleteItem('${id}', '${type}')">Delete</div>
    `;
    
    document.body.appendChild(menu);
    contextMenu = menu;
}

function hideContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
}

// Editing
function editName(id, type) {
    const element = document.querySelector(`[data-id="${id}"]`);
    const nameSpan = element.querySelector('.name');
    const currentName = nameSpan.textContent;
    
    const input = document.createElement('input');
    input.value = currentName;
    input.addEventListener('blur', () => finishRename(id, type, input.value));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishRename(id, type, input.value);
        }
    });
    
    nameSpan.replaceWith(input);
    input.select();
}

function finishRename(id, type, newName) {
    if (!newName.trim()) {
        renderFileTree();
        return;
    }
    
    if (type === 'folder') {
        fileSystem.folders[id].name = newName.trim();
    } else {
        fileSystem.files[id].name = newName.trim();
        if (id === currentFileId) {
            document.getElementById('currentFileName').textContent = newName.trim();
        }
    }
    
    renderFileTree();
    saveToLocalStorage();
    
    // Save renames to disk immediately
    saveFilesystemToDisk();
}

// Formatting functions for menu integration
function applyFormatting(prefix, suffix = '') {
    if (!currentFileId) return;
    
    const editor = document.getElementById('textEditor');
    const preview = document.getElementById('formattedPreview');
    
    MarkdownFormatter.insertFormatting(editor, prefix, suffix);
    MarkdownFormatter.updateFormattedPreview(editor, preview);
    
    // Trigger auto-save
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveCurrentFile();
        autoSaveToDisk();
    }, 500);
}

// Status updates
function updateSyncStatus(status) {
    const syncStatus = document.getElementById('syncStatus');
    syncStatus.className = 'sync-status ' + status;
    
    switch (status) {
        case 'saving':
            syncStatus.textContent = 'Saving binary...';
            break;
        case 'saved':
            syncStatus.textContent = 'Binary saved ⚡';
            setTimeout(() => {
                syncStatus.className = 'sync-status';
                syncStatus.textContent = 'Ready';
            }, 1500);
            break;
        case 'error':
            syncStatus.textContent = 'Save error';
            syncStatus.className = 'sync-status saving';
            break;
        default:
            syncStatus.textContent = 'Ready';
    }
}

// Local storage persistence
function saveToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('simpleNotesData', JSON.stringify(fileSystem));
    }
}

function loadFromLocalStorage() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('simpleNotesData');
        if (saved) {
            try {
                fileSystem = JSON.parse(saved);
                console.log('📦 Loaded data from localStorage');
            } catch (error) {
                console.error('❌ Failed to load saved data:', error);
            }
        }
    }
}

// Binary storage operations
async function loadFromBinary() {
    if (!isElectron) return;
    
    try {
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('load-filesystem-binary');
        
        if (result.success) {
            fileSystem = result.fileSystem;
            console.log('⚡ Loaded from binary format - ULTRA FAST!');
        }
    } catch (error) {
        console.log('💾 No binary data found, using localStorage data');
    }
}

async function autoSaveToDisk() {
    if (!isElectron) return;
    
    try {
        const { ipcRenderer } = require('electron');
        await ipcRenderer.invoke('batch-save-notes', fileSystem);
        updateSyncStatus('saved');
        console.log('⚡ Filesystem saved to binary storage');
    } catch (error) {
        console.error('❌ Binary auto-save failed:', error);
        updateSyncStatus('error');
    }
}

// Immediate save for filesystem changes (create, delete, rename, move)
async function saveFilesystemToDisk() {
    if (!isElectron) return;
    
    try {
        updateSyncStatus('saving');
        const { ipcRenderer } = require('electron');
        await ipcRenderer.invoke('batch-save-notes', fileSystem);
        updateSyncStatus('saved');
        console.log('⚡ Filesystem changes saved to binary storage');
    } catch (error) {
        console.error('❌ Filesystem save failed:', error);
        updateSyncStatus('error');
    }
}

async function exportNote(fileId) {
    if (!isElectron) {
        alert('Export feature requires desktop app');
        return;
    }

    try {
        const { ipcRenderer } = require('electron');
        const file = fileSystem.files[fileId];
        const result = await ipcRenderer.invoke('export-note', file.name, file.content);
        
        if (result.success && !result.canceled) {
            alert(`Note exported successfully to: ${result.path}`);
        }
    } catch (error) {
        alert('Export failed: ' + error.message);
    }
    hideContextMenu();
}

// Electron integration
function setupElectronIntegration() {
    const { ipcRenderer } = require('electron');
    
    // Ensure notes directory exists
    ipcRenderer.invoke('ensure-notes-directory');
    
    // Handle menu events
    ipcRenderer.on('menu-new-file', () => createFile());
    ipcRenderer.on('menu-new-folder', () => createFolder());
    ipcRenderer.on('menu-save', () => {
        saveCurrentFile();
        autoSaveToDisk();
    });
    
    // Formatting menu events
    ipcRenderer.on('menu-format-title', () => applyFormatting('$$', '$$'));
    ipcRenderer.on('menu-format-subtitle', () => applyFormatting('$', '$'));
    ipcRenderer.on('menu-format-bold', () => applyFormatting('**', '**'));
    ipcRenderer.on('menu-format-italic', () => applyFormatting('*', '*'));
    ipcRenderer.on('menu-format-underline', () => applyFormatting('_', '_'));
    ipcRenderer.on('menu-format-monospace', () => applyFormatting('[', ']'));
    
    // Export current note
    ipcRenderer.on('menu-export-current', async () => {
        if (!currentFileId) {
            alert('No file is currently open');
            return;
        }
        await exportNote(currentFileId);
    });
    
    // Export all notes to folder
    ipcRenderer.on('menu-export-all', async () => {
        try {
            updateSyncStatus('saving');
            const result = await ipcRenderer.invoke('export-all-notes', fileSystem);
            
            if (result.success && !result.canceled) {
                alert(`Successfully exported ${result.count} notes to: ${result.path}`);
                updateSyncStatus('saved');
            } else if (!result.canceled) {
                alert('Export failed: ' + result.error);
                updateSyncStatus('error');
            }
        } catch (error) {
            alert('Export failed: ' + error.message);
            updateSyncStatus('error');
        }
    });

    // Import notes from disk
    ipcRenderer.on('menu-import-from-disk', async () => {
        try {
            const result = await ipcRenderer.invoke('import-from-disk');
            
            if (result.success && !result.canceled) {
                if (result.files.length === 0) {
                    alert('No .txt files found in the selected folder');
                    return;
                }

                const confirmMessage = `Found ${result.files.length} text files. This will add them to your current notes. Continue?`;
                if (!confirm(confirmMessage)) return;

                // Import files into the app
                for (const importedFile of result.files) {
                    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    // Create folder if needed
                    let folderId = null;
                    if (importedFile.folder) {
                        const folderName = importedFile.folder;
                        const existingFolder = Object.values(fileSystem.folders).find(f => f.name === folderName);
                        
                        if (existingFolder) {
                            folderId = existingFolder.id;
                        } else {
                            folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                            fileSystem.folders[folderId] = {
                                id: folderId,
                                name: folderName,
                                files: []
                            };
                        }
                    }

                    fileSystem.files[fileId] = {
                        id: fileId,
                        name: importedFile.name,
                        content: importedFile.content,
                        folderId: folderId
                    };
                }

                renderFileTree();
                saveToLocalStorage();
                alert(`Successfully imported ${result.files.length} notes!`);
            }
        } catch (error) {
            alert('Import failed: ' + error.message);
        }
    });
    
    // JSON export
    ipcRenderer.on('menu-export', async (event, filePath) => {
        try {
            const data = JSON.stringify(fileSystem, null, 2);
            await ipcRenderer.invoke('save-file', filePath, data);
            alert('Notes exported successfully!');
        } catch (error) {
            alert('Export failed: ' + error.message);
        }
    });
    
    // JSON import
    ipcRenderer.on('menu-import', (event, data) => {
        try {
            const imported = JSON.parse(data);
            if (confirm('This will replace all current notes. Continue?')) {
                fileSystem = imported;
                currentFileId = null;
                document.getElementById('currentFileName').textContent = 'Select a file to edit';
                document.getElementById('emptyState').style.display = 'flex';
                document.getElementById('editorContainer').style.display = 'none';
                renderFileTree();
                saveToLocalStorage();
                alert('Notes imported successfully!');
            }
        } catch (error) {
            alert('Import failed: Invalid file format');
        }
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);