import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encrypt and decrypt', () => {
    it('should successfully encrypt and decrypt a string', () => {
      const plainText = '4242424242424242';

      const encrypted = service.encrypt(plainText);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // Format: iv:encryptedData:authTag

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should produce different encrypted values for the same input', () => {
      const plainText = '4242424242424242';

      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(service.decrypt(encrypted1)).toBe(plainText);
      expect(service.decrypt(encrypted2)).toBe(plainText);
    });

    it('should encrypt and decrypt sensitive payment data', () => {
      const cardNumber = '5555555555554444';
      const cvv = '123';
      const accountNumber = '1234567890';

      const encryptedCard = service.encrypt(cardNumber);
      const encryptedCvv = service.encrypt(cvv);
      const encryptedAccount = service.encrypt(accountNumber);

      expect(service.decrypt(encryptedCard)).toBe(cardNumber);
      expect(service.decrypt(encryptedCvv)).toBe(cvv);
      expect(service.decrypt(encryptedAccount)).toBe(accountNumber);
    });

    it('should handle unicode characters', () => {
      const plainText = 'Test 测试 тест 🔒';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should throw error for invalid encrypted data format', () => {
      const invalidData = 'invalid:encrypted:data';

      expect(() => service.decrypt(invalidData)).toThrow();
    });

    it('should throw error for tampered encrypted data', () => {
      const plainText = '4242424242424242';
      const encrypted = service.encrypt(plainText);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      parts[1] = parts[1].substring(0, parts[1].length - 2) + 'XX';
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should handle empty strings', () => {
      const plainText = '';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle very long strings', () => {
      const plainText = 'A'.repeat(10000);

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
      expect(decrypted.length).toBe(10000);
    });
  });

  describe('getCardLast4', () => {
    it('should return last 4 digits of card number', () => {
      const cardNumber = '4242424242424242';
      const last4 = service.getCardLast4(cardNumber);

      expect(last4).toBe('4242');
    });

    it('should handle card numbers shorter than 4 digits', () => {
      const cardNumber = '123';
      const last4 = service.getCardLast4(cardNumber);

      expect(last4).toBe('123');
    });

    it('should handle empty string', () => {
      const cardNumber = '';
      const last4 = service.getCardLast4(cardNumber);

      expect(last4).toBe('');
    });
  });

  describe('maskCardNumber', () => {
    it('should mask card number showing only last 4 digits', () => {
      const cardNumber = '4242424242424242';
      const masked = service.maskCardNumber(cardNumber);

      expect(masked).toBe('************4242');
    });

    it('should handle card numbers with spaces', () => {
      const cardNumber = '4242 4242 4242 4242';
      const masked = service.maskCardNumber(cardNumber);

      expect(masked).toContain('4242');
      expect(masked).toContain('*');
    });

    it('should handle short card numbers', () => {
      const cardNumber = '1234';
      const masked = service.maskCardNumber(cardNumber);

      expect(masked).toBe('1234');
    });
  });
});
