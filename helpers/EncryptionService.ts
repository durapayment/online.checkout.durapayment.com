// src/utils/EncryptionService.ts
import CryptoJS from "crypto-js";

export class EncryptionService {
  private key: CryptoJS.lib.WordArray;

  constructor(encryptionKey: string) {
    // Convert key to WordArray
    this.key = CryptoJS.enc.Utf8.parse(encryptionKey);
  }

  async decryptParameters(
    encryptedData: string,
  ): Promise<Record<string, string>> {
    try {
      // URL-safe base64 decode
      const base64 = encryptedData.replace(/-/g, "+").replace(/_/g, "/");
      const padding = base64.length % 4;
      const paddedBase64 = base64 + "===".slice(0, padding);

      // Decode base64
      const decoded = CryptoJS.enc.Base64.parse(paddedBase64);

      // Extract IV (first 16 bytes/4 words) and ciphertext
      const iv = CryptoJS.lib.WordArray.create(decoded.words.slice(0, 4));
      const ciphertext = CryptoJS.lib.WordArray.create(decoded.words.slice(4));

      // Decrypt using AES-256-CBC
      const decrypted = CryptoJS.AES.decrypt({ ciphertext } as any, this.key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Convert to string
      const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedStr) {
        throw new Error("Decryption failed - empty result");
      }

      // Parse JSON
      const params = JSON.parse(decryptedStr);

      return params;
    } catch (error: any) {
      console.error("Decryption failed:", error);
      console.error("Encrypted data:", encryptedData);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  // Alternative method that handles both Laravel's defuse/php-encryption and our new format
  async decryptParametersV2(
    encryptedData: string,
  ): Promise<Record<string, string>> {
    try {
      // Try method 1 (our new format)
      return await this.decryptParameters(encryptedData);
    } catch (error1) {
      console.log("Method 1 failed, trying method 2...");

      // Method 2: Try old format or other variations
      try {
        // Remove URL encoding if present
        const decoded = decodeURIComponent(encryptedData);

        // Try direct decryption (for base64 encoded ciphertext)
        const decrypted = CryptoJS.AES.decrypt(decoded, this.key, {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });

        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

        if (decryptedStr) {
          // Try parsing as JSON
          try {
            return JSON.parse(decryptedStr);
          } catch {
            // Try parsing as query string
            const params = new URLSearchParams(decryptedStr);
            const result: Record<string, string> = {};

            params.forEach((value, key) => {
              result[key] = value;
            });

            return result;
          }
        }

        throw new Error("Decryption failed");
      } catch (error2) {
        console.error("All decryption methods failed:", error2);
        throw new Error("Failed to decrypt data with all methods");
      }
    }
  }
}
