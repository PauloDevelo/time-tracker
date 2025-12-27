import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, generateToken } from './auth';
import { User } from '../models/User';
import { AuthenticatedRequest } from './authenticated-request.model';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/User');

/**
 * Unit tests for the auth middleware and generateToken function.
 * 
 * These tests verify:
 * - JWT token validation in auth middleware
 * - User lookup from decoded token
 * - Proper attachment of user to request object
 * - Error handling for missing/invalid tokens
 * - Token generation with generateToken function
 */

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  header: jest.fn().mockReturnValue(undefined),
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock next function
const createMockNext = (): jest.MockedFunction<NextFunction> => jest.fn();

// Helper to create mock user
const createMockUser = (overrides = {}) => ({
  _id: 'user-id-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedpassword',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  // Set up default JWT_SECRET for tests
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '24h';
});

afterEach(() => {
  // Clean up environment variables
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

describe('Auth Middleware', () => {
  describe('auth', () => {
    /**
     * Test: should call next() when valid token and user exist
     * 
     * Objective: Verify that the middleware calls next() when a valid
     * JWT token is provided and the user exists in the database.
     */
    it('should call next() when valid token and user exist', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockToken = 'valid-jwt-token';
      const mockDecodedPayload = { userId: 'user-id-123' };

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test: should attach user to request object
     * 
     * Objective: Verify that the authenticated user is properly attached
     * to the request object for use in subsequent middleware/handlers.
     */
    it('should attach user to request object', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockToken = 'valid-jwt-token';
      const mockDecodedPayload = { userId: 'user-id-123' };

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect((req as AuthenticatedRequest).user).toBe(mockUser);
    });

    /**
     * Test: should return 401 when no Authorization header provided
     * 
     * Objective: Verify that the middleware returns 401 status when
     * the Authorization header is missing from the request.
     */
    it('should return 401 when no Authorization header provided', async () => {
      // Arrange
      const req = createMockRequest({
        header: jest.fn().mockReturnValue(undefined)
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 401 when Authorization header has no Bearer token
     * 
     * Objective: Verify that the middleware returns 401 when the
     * Authorization header exists but doesn't contain a Bearer token.
     */
    it('should return 401 when Authorization header has no Bearer token', async () => {
      // Arrange
      const req = createMockRequest({
        header: jest.fn().mockReturnValue('Bearer ')
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 401 when token is invalid/malformed
     * 
     * Objective: Verify that the middleware returns 401 when jwt.verify
     * throws an error due to an invalid or malformed token.
     */
    it('should return 401 when token is invalid/malformed', async () => {
      // Arrange
      const mockToken = 'invalid-jwt-token';

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
      expect(User.findById).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 401 when token is expired
     * 
     * Objective: Verify that the middleware returns 401 when jwt.verify
     * throws a TokenExpiredError.
     */
    it('should return 401 when token is expired', async () => {
      // Arrange
      const mockToken = 'expired-jwt-token';

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 401 when user not found in database
     * 
     * Objective: Verify that the middleware returns 401 when the token
     * is valid but the user no longer exists in the database.
     */
    it('should return 401 when user not found in database', async () => {
      // Arrange
      const mockToken = 'valid-jwt-token';
      const mockDecodedPayload = { userId: 'non-existent-user-id' };

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      (User.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
      expect(User.findById).toHaveBeenCalledWith('non-existent-user-id');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 401 when database lookup fails
     * 
     * Objective: Verify that the middleware returns 401 when the
     * User.findById call throws an error (database error).
     */
    it('should return 401 when database lookup fails', async () => {
      // Arrange
      const mockToken = 'valid-jwt-token';
      const mockDecodedPayload = { userId: 'user-id-123' };

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      (User.findById as jest.Mock).mockRejectedValue(new Error('Database connection error'));

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please authenticate.' });
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test: should extract token correctly from Bearer format
     * 
     * Objective: Verify that the middleware correctly extracts the token
     * from the "Bearer <token>" format in the Authorization header.
     */
    it('should extract token correctly from Bearer format', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockToken = 'my-specific-token-value';
      const mockDecodedPayload = { userId: 'user-id-123' };

      const req = createMockRequest({
        header: jest.fn().mockReturnValue(`Bearer ${mockToken}`)
      });
      const res = createMockResponse();
      const next = createMockNext();

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedPayload);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await auth(req as Request, res as Response, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key');
    });
  });

  describe('generateToken', () => {
    /**
     * Test: should generate valid JWT token with userId
     * 
     * Objective: Verify that generateToken creates a JWT token
     * containing the provided userId in the payload.
     */
    it('should generate valid JWT token with userId', () => {
      // Arrange
      const userId = 'user-id-123';
      const expectedToken = 'generated-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const token = generateToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      expect(token).toBe(expectedToken);
    });

    /**
     * Test: should use default expiration when JWT_EXPIRES_IN not set
     * 
     * Objective: Verify that generateToken uses '24h' as the default
     * expiration when JWT_EXPIRES_IN environment variable is not set.
     */
    it('should use default expiration when JWT_EXPIRES_IN not set', () => {
      // Arrange
      delete process.env.JWT_EXPIRES_IN;
      const userId = 'user-id-123';
      const expectedToken = 'generated-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const token = generateToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      expect(token).toBe(expectedToken);
    });

    /**
     * Test: should use custom expiration when JWT_EXPIRES_IN is set
     * 
     * Objective: Verify that generateToken uses the custom expiration
     * value from JWT_EXPIRES_IN environment variable when set.
     */
    it('should use custom expiration when JWT_EXPIRES_IN is set', () => {
      // Arrange
      process.env.JWT_EXPIRES_IN = '7d';
      const userId = 'user-id-123';
      const expectedToken = 'generated-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const token = generateToken(userId);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-secret-key',
        { expiresIn: '7d' }
      );
      expect(token).toBe(expectedToken);
    });

    /**
     * Test: should throw error when JWT_SECRET is not defined
     * 
     * Objective: Verify that generateToken throws an error when
     * the JWT_SECRET environment variable is not set.
     */
    it('should throw error when JWT_SECRET is not defined', () => {
      // Arrange
      delete process.env.JWT_SECRET;
      const userId = 'user-id-123';

      // Act & Assert
      expect(() => generateToken(userId)).toThrow('JWT_SECRET is not defined');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    /**
     * Test: should return string token
     * 
     * Objective: Verify that generateToken returns a string value.
     */
    it('should return string token', () => {
      // Arrange
      const userId = 'user-id-123';
      const expectedToken = 'string-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const token = generateToken(userId);

      // Assert
      expect(typeof token).toBe('string');
    });
  });
});
