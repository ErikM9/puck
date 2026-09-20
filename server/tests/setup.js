/* Test-only values, since the suites stub the mail transport and use an in-memory database */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'noreply@puck.test';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'test-pass';
