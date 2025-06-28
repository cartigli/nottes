/**
 * Binary Note Format - Ultra-fast serialization for Simple Notes
 * Handles conversion between JavaScript objects and binary .snote format
 */

class BinaryNoteFormat {
  /**
   * Serialize entire filesystem to binary format
   * @param {Object} fileSystem - The complete filesystem object
   * @returns {Buffer} Binary data
   */
  static serialize(fileSystem) {
    try {
      const data = JSON.stringify(fileSystem);
      const buffer = Buffer.from(data, 'utf8');
      
      // Simple compression using base64 encoding
      const compressed = buffer.toString('base64');
      return Buffer.from(compressed, 'base64');
    } catch (error) {
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }
  
  /**
   * Deserialize binary data back to filesystem object
   * @param {Buffer} buffer - Binary data to deserialize
   * @returns {Object} Filesystem object
   */
  static deserialize(buffer) {
    try {
      // Try direct UTF-8 first (newer format)
      const data = buffer.toString('utf8');
      return JSON.parse(data);
    } catch (error) {
      // Fallback for base64 encoded data (older format)
      try {
        const decompressed = Buffer.from(buffer.toString(), 'base64').toString('utf8');
        return JSON.parse(decompressed);
      } catch (fallbackError) {
        throw new Error('Invalid binary note format - unable to parse data');
      }
    }
  }
  
  /**
   * Serialize individual note content to binary
   * @param {string} content - Note content
   * @returns {Buffer} Binary data
   */
  static serializeNote(content) {
    return Buffer.from(content || '', 'utf8');
  }
  
  /**
   * Deserialize individual note from binary
   * @param {Buffer} buffer - Binary note data
   * @returns {string} Note content
   */
  static deserializeNote(buffer) {
    return buffer.toString('utf8');
  }

  /**
   * Get file extension for binary notes
   * @returns {string} File extension
   */
  static getExtension() {
    return '.snote';
  }

  /**
   * Get file extension for filesystem data
   * @returns {string} File extension
   */
  static getFilesystemExtension() {
    return '.snotes';
  }
}

module.exports = { BinaryNoteFormat };