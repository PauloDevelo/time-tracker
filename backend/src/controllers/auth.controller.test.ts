import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { signup, login, logout, getCurrentUser } from './auth.controller';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the dependencies
jest.mock('../models/User');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

/**
 * Unit tests for the Auth controller.
 * 
 * These tests verify:
 * - User signup with password hashing
 * - User login with credential validation
 * - User logout with callback pattern
 * - Get current user with authentication check
 * - Error handling (400, 401, 404, 500 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  body: {},
  user: undefined,
  logout: jest.fn(),
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock user data
const createMockUser = (overrides = {}) => ({
  _id: createObjectId(),
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'hashedPassword123',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-jwt-secret';
});

describe('Auth Controller', () => {
  describe('signup', () => {
    /**
     * Test: should create new user with hashed password and return 201
     * 
     * Objective: Verify that a new user is created with a hashed password
     * and the response includes user info and token.
     */
    it('should create new user with hashed password and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const hashedPassword = 'hashedPassword123';
      const token = 'jwt-token-123';
      const mockCreatedUser = {
        _id: userId,
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        password: hashedPassword
      };

      const req = createMockRequest({
        body: {
          email: 'newuser@example.com',
          password: 'plainPassword123',
          firstName: 'Jane',
          lastName: 'Doe'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      // Act
      await signup(req as Request, res as Response);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword123', 10);
      expect(User.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Doe'
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-jwt-secret',
        { expiresIn: '7d' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: userId,
          email: 'newuser@example.com',
          firstName: 'Jane'
        },
        token
      });
    });

    /**
     * Test: should return 400 when email already registered
     * 
     * Objective: Verify that duplicate email registration is rejected.
     */
    it('should return 400 when email already registered', async () => {
      // Arrange
      const existingUser = createMockUser({ email: 'existing@example.com' });

      const req = createMockRequest({
        body: {
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      await signup(req as Request, res as Response);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const req = createMockRequest({
        body: {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      await signup(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create user' });
    });

    /**
     * Test: should return 500 when User.create fails
     * 
     * Objective: Verify that errors during user creation are handled.
     */
    it('should return 500 when User.create fails', async () => {
      // Arrange
      const req = createMockRequest({
        body: {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (User.create as jest.Mock).mockRejectedValue(new Error('Create failed'));

      // Act
      await signup(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create user' });
    });
  });

  describe('login', () => {
    /**
     * Test: should return 200 with user info and token on valid credentials
     * 
     * Objective: Verify that valid credentials return user info and JWT token.
     */
    it('should return 200 with user info and token on valid credentials', async () => {
      // Arrange
      const userId = createObjectId();
      const token = 'jwt-token-456';
      const mockUser = {
        _id: userId,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashedPassword123'
      };

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'correctPassword'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      // Act
      await login(req as Request, res as Response);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashedPassword123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        'test-jwt-secret',
        { expiresIn: '7d' }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: userId,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        token
      });
    });

    /**
     * Test: should return 401 when email not found
     * 
     * Objective: Verify that non-existent email returns 401.
     */
    it('should return 401 when email not found', async () => {
      // Arrange
      const req = createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await login(req as Request, res as Response);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });

    /**
     * Test: should return 401 when password is incorrect
     * 
     * Objective: Verify that incorrect password returns 401.
     */
    it('should return 401 when password is incorrect', async () => {
      // Arrange
      const mockUser = createMockUser();

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'wrongPassword'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      await login(req as Request, res as Response);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', mockUser.password);
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await login(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to log in' });
    });

    /**
     * Test: should return 500 when bcrypt.compare fails
     * 
     * Objective: Verify that bcrypt errors are handled gracefully.
     */
    it('should return 500 when bcrypt.compare fails', async () => {
      // Arrange
      const mockUser = createMockUser();

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      });
      const res = createMockResponse();

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Act
      await login(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to log in' });
    });
  });

  describe('logout', () => {
    /**
     * Test: should call req.logout and return success message
     * 
     * Objective: Verify that logout calls the callback and returns success.
     */
    it('should call req.logout and return success message', () => {
      // Arrange
      const res = createMockResponse();
      const mockLogout = jest.fn((callback: (err: any) => void) => {
        callback(null);
      });
      const req = createMockRequest({
        logout: mockLogout as any
      });

      // Act
      logout(req as Request, res as Response);

      // Assert
      expect(mockLogout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    /**
     * Test: should handle logout callback correctly
     * 
     * Objective: Verify that the callback pattern works as expected.
     */
    it('should handle logout callback correctly', () => {
      // Arrange
      const res = createMockResponse();
      let capturedCallback: ((err: any) => void) | undefined;
      const mockLogout = jest.fn((callback: (err: any) => void) => {
        capturedCallback = callback;
      });
      const req = createMockRequest({
        logout: mockLogout as any
      });

      // Act
      logout(req as Request, res as Response);

      // Assert - callback should be captured
      expect(mockLogout).toHaveBeenCalledWith(expect.any(Function));
      
      // Simulate callback execution
      if (capturedCallback) {
        capturedCallback(null);
      }
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  describe('getCurrentUser', () => {
    /**
     * Test: should return user data when authenticated
     * 
     * Objective: Verify that authenticated user data is returned correctly.
     */
    it('should return user data when authenticated', async () => {
      // Arrange
      const userId = createObjectId();
      const mockUser = {
        _id: userId,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    /**
     * Test: should exclude __v field from response
     * 
     * Objective: Verify that the select('-__v') is called to exclude version field.
     */
    it('should exclude __v field from response', async () => {
      // Arrange
      const userId = createObjectId();
      const mockUser = createMockUser({ _id: userId });
      const selectMock = jest.fn().mockResolvedValue(mockUser);

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (User.findById as jest.Mock).mockReturnValue({
        select: selectMock
      });

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(selectMock).toHaveBeenCalledWith('-__v');
    });

    /**
     * Test: should return 401 when user not authenticated (req.user is null)
     * 
     * Objective: Verify that unauthenticated requests return 401.
     */
    it('should return 401 when user not authenticated (req.user is null)', async () => {
      // Arrange
      const req = createMockRequest({
        user: undefined
      });
      const res = createMockResponse();

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(User.findById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    /**
     * Test: should return 401 when req.user is explicitly null
     * 
     * Objective: Verify that null user returns 401.
     */
    it('should return 401 when req.user is explicitly null', async () => {
      // Arrange
      const req = createMockRequest();
      (req as any).user = null;
      const res = createMockResponse();

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    /**
     * Test: should return 404 when user not found in database
     * 
     * Objective: Verify that missing user in database returns 404.
     */
    it('should return 404 when user not found in database', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching user data' });
    });

    /**
     * Test: should return 500 when User.findById throws
     * 
     * Objective: Verify that findById errors are handled gracefully.
     */
    it('should return 500 when User.findById throws', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (User.findById as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      await getCurrentUser(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching user data' });
    });
  });
});
