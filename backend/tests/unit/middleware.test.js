// tests/unit/middleware.test.js
const express = require('express');
const request = require('supertest');

describe('Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  describe('Request ID Middleware', () => {
    it('should add request ID to headers', async () => {
      // Simulate the request ID middleware
      app.use((req, res, next) => {
        req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        res.setHeader('X-Request-ID', req.requestId);
        next();
      });

      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response = await request(app).get('/test');
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('should generate unique request IDs', async () => {
      app.use((req, res, next) => {
        req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        res.setHeader('X-Request-ID', req.requestId);
        next();
      });

      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response1 = await request(app).get('/test');
      const response2 = await request(app).get('/test');
      
      expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
    });
  });

  describe('JSON Parsing Middleware', () => {
    it('should parse JSON request bodies', async () => {
      app.use(express.json());
      
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { name: 'Test', value: 123 };
      const response = await request(app)
        .post('/test')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });

    it('should reject invalid JSON', async () => {
      app.use(express.json());
      
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      // Send invalid JSON
      const response = await request(app)
        .post('/test')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should catch and handle errors', async () => {
      app.get('/error', (req, res, next) => {
        next(new Error('Test error'));
      });

      // Error handler
      app.use((err, req, res, next) => {
        res.status(500).json({
          error: err.message,
          requestId: req.requestId
        });
      });

      const response = await request(app).get('/error');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Test error');
    });
  });
});
