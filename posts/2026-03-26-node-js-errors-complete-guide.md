---
title: "Node.js Errors — Complete Guide"
date: 2026-03-26
description: "Everything about NodeJS Errors"
tags: [Node.js, Javascript]
draft: false
---
# Node.js Errors — Complete Guide

## What Are Node.js Errors?

Node.js has a built-in `Error` class and several specialized error types that represent failures in your application. They carry a `message`, `stack`, `name`, and sometimes a `code` property.

---

## Built-in Error Types

Error TypeWhen It Occurs`Error`Base class for all errors`TypeError`Wrong data type passed`RangeError`Value outside acceptable range`SyntaxError`Invalid JavaScript syntax`ReferenceError`Variable not defined`URIError`Invalid URI encoding`EvalErroreval()` misuse`SystemError`OS-level failures (file, network)

### System Error Codes (Node-specific)

```js
err.code === 'ENOENT'        // File not found
err.code === 'EACCES'        // Permission denied
err.code === 'ECONNREFUSED'  // Connection refused
err.code === 'ETIMEDOUT'     // Operation timed out
err.code === 'EADDRINUSE'    // Port already in use
```

---

## Real-World Patterns

### 1. Custom Application Errors

```js
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // vs programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message, fields) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Authentication required', 401, 'UNAUTHORIZED');
  }
}

module.exports = { AppError, NotFoundError, ValidationError, UnauthorizedError };
```

---

### 2. Express Global Error Handler

```js
// middleware/errorHandler.js
const { AppError } = require('../errors/AppError');

function errorHandler(err, req, res, next) {
  // Log all errors with context
  console.error({
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Operational errors: safe to expose to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.fields && { fields: err.fields }),
    });
  }

  // Programmer errors: hide details from client
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
}

module.exports = errorHandler;
```

```js
// app.js
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./errors/AppError');

const app = express();

app.use(express.json());
app.use('/api', require('./routes'));

// 404 handler — must be BEFORE errorHandler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.path}`));
});

// Must be LAST middleware, with 4 params
app.use(errorHandler);
```

---

### 3. Async Error Wrapper (Avoid try/catch everywhere)

```js
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

```js
// routes/users.js
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ValidationError } = require('../errors/AppError');

router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^\d+$/)) {
    throw new ValidationError('Invalid user ID', { id: 'Must be numeric' });
  }

  const user = await UserService.findById(id);
  if (!user) throw new NotFoundError('User');

  res.json({ success: true, data: user });
}));
```

---

### 4. Database Error Handling

```js
// services/UserService.js
const { AppError } = require('../errors/AppError');

class UserService {
  static async findById(id) {
    try {
      return await db.query('SELECT * FROM users WHERE id = $1', [id]);
    } catch (err) {
      // Translate DB errors into domain errors
      if (err.code === '23505') { // Postgres unique violation
        throw new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
      }
      if (err.code === '23503') { // Foreign key violation
        throw new AppError('Referenced resource not found', 400, 'FK_VIOLATION');
      }
      // Unknown DB error — rethrow as-is (programmer error)
      throw err;
    }
  }
}
```

---

### 5. Uncaught Errors — Process-Level Safety Net

```js
// index.js
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION — shutting down:', err);
  process.exit(1); // Always exit — state is unpredictable
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  // Graceful shutdown
  server.close(() => process.exit(1));
});
```

---

### 6. File System Error Handling

```js
const fs = require('fs/promises');
const { AppError } = require('./errors/AppError');

async function readConfig(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new AppError(`Config file not found: ${filePath}`, 404, 'CONFIG_MISSING');
    }
    if (err.code === 'EACCES') {
      throw new AppError(`Permission denied: ${filePath}`, 403, 'PERMISSION_DENIED');
    }
    if (err instanceof SyntaxError) {
      throw new AppError('Invalid JSON in config file', 400, 'INVALID_CONFIG');
    }
    throw err;
  }
}
```

---

## Interview Questions

### Beginner

**Q1. What is the difference between** `Error` **and** `TypeError` **in Node.js?**

`Error` is the base class. `TypeError` extends it and specifically signals that a value is not of the expected type — e.g., calling `.map()` on a non-array.

**Q2. What does** `Error.captureStackTrace` **do?**

It attaches a `.stack` property to an object and lets you exclude frames above a given function, so custom error classes don't pollute the stack trace with their own constructor calls.

**Q3. What is the difference between synchronous and asynchronous errors in Node.js?**

Sync errors are thrown and caught with `try/catch`. Async errors in callbacks use the `(err, data)` convention; in Promises, use `.catch()`; in async/await, use `try/catch`.

---

### Intermediate

**Q4. What is the difference between operational errors and programmer errors?**

- **Operational**: Expected runtime failures (DB down, file missing, invalid input) — safe to catch and respond gracefully.
- **Programmer**: Bugs in code (calling undefined, logic errors) — should crash the process since app state is unknown.

**Q5. Why should you call** `process.exit(1)` **after an** `uncaughtException`**?**

Because the process is in an undefined state. Continuing could cause data corruption, memory leaks, or silent failures. The correct response is to log, then exit and let a process manager (PM2, systemd) restart.

**Q6. How does Express's global error handler differ from regular middleware?**

It takes 4 parameters `(err, req, res, next)` — the first `err` param is what signals Express to treat it as an error handler. It must be registered last.

**Q7. How would you handle unhandled promise rejections in older Node.js versions?**

Using `process.on('unhandledRejection', handler)`. In Node 15+, unhandled rejections crash the process by default (same as `uncaughtException`).

---

### Advanced

**Q8. How do you avoid wrapping every async route with try/catch in Express?**

Use an `asyncHandler` HOF that wraps the async function, resolves the promise, and calls `next(err)` on rejection. This centralizes error forwarding to the global error handler.

**Q9. How would you design a multi-layer error strategy for a large Node.js API?**

1. **Domain layer**: Custom error classes with `isOperational`, `statusCode`, `code`
2. **Service layer**: Catch and translate external errors (DB, third-party) into domain errors
3. **Route layer**: `asyncHandler` to forward to Express error middleware
4. **Error middleware**: Separate operational vs programmer errors, format response
5. **Process level**: `uncaughtException` + `unhandledRejection` for last resort

**Q10. What is the** `domain` **module and why was it deprecated?**

`domain` was Node's early attempt to catch errors across async contexts. It was deprecated because it had subtle bugs, couldn't properly scope async state, and was superseded by Promises, async/await, and `AsyncLocalStorage`.

**Q11. How would you propagate errors across microservices?**

Serialize the error `code` and `message` (never the stack) in the HTTP response body. On the consumer side, reconstruct a domain error from the `code` field so each service handles it appropriately without leaking internals.

**Q12. What is** `AsyncLocalStorage` **and how does it help with error tracing?**

It maintains a context (like a request ID) across async boundaries without passing it explicitly. When an error occurs, you can attach the stored request ID to the log, enabling distributed tracing across async calls.

```js
const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

app.use((req, res, next) => {
  storage.run({ requestId: req.id }, next);
});

// In errorHandler:
const ctx = storage.getStore();
logger.error({ ...ctx, message: err.message });
```

---

## Quick Reference Cheat Sheet

```
throw new Error()           → use inside sync or async/await code
next(err)                   → use inside Express middleware/routes
reject(err)                 → use inside Promise constructors
EventEmitter.emit('error')  → use for stream/event-based errors
process.exit(1)             → use after uncaughtException ONLY
```
