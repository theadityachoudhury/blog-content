---
title: "Node.js Crypto — Complete Guide & Interview Q&A"
date: 2026-03-26
description: "Everything about crypto module for interview preparation"
tags: [Node.js, Javascript]
draft: false
---
# Node.js Crypto — Complete Guide & Interview Q&A

> Published from a Claude Code conversation | Date: 2026-03-26

---

## What is Node.js Crypto?

Node.js `crypto` is a built-in module that provides cryptographic functionality — hashing, encryption/decryption, signing, key generation, and random number generation. It wraps OpenSSL under the hood.

```js
const crypto = require("crypto"); // CommonJS
import crypto from "crypto"; // ESM
```

---

## Core Concepts

### 1. Hashing

One-way transformation of data into a fixed-length digest.

**What is a digest?**

A digest is the fixed-size output (fingerprint) produced by a hash function.

- Same input always gives the same digest
- Small input changes produce a very different digest
- It is not reversible (you cannot recover the original input from the digest)

```js
const hash = crypto.createHash("sha256").update("hello").digest("hex");
```

Common algorithms: `md5`, `sha1`, `sha256`, `sha512`

---

### 2. HMAC (Hash-based Message Authentication Code)

Hashing with a secret key to verify both **integrity** and **authenticity**.

```js
const hmac = crypto
	.createHmac("sha256", "secret-key")
	.update("data")
	.digest("hex");
```

---

### 3. Encryption / Decryption

**What is a cipher?**

A cipher is the algorithm or encryption mechanism that transforms plaintext into ciphertext using a key and, in many modes, an IV.

In Node.js, this usually refers to the `Cipher` object returned by `crypto.createCipheriv(...)`, which performs the encryption.

**Symmetric** (same key for both):

```js
// AES-256-CBC
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
const encrypted =
	cipher.update("plaintext", "utf8", "hex") + cipher.final("hex");
```

**Asymmetric** (public/private key pair):

```js
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
```

---

### 4. Random Values

```js
crypto.randomBytes(16); // Buffer of random bytes
crypto.randomUUID(); // RFC 4122 UUID
crypto.randomInt(1, 100); // Random integer
```

**Does** `randomBytes()` **return memory outside the V8 heap?**

`crypto.randomBytes()` returns a Node.js `Buffer`.

- The `Buffer` object itself is a JavaScript object managed by V8
- The raw byte storage backing that `Buffer` is typically allocated outside the main V8 heap
- So the bytes are generally stored in external/off-heap memory, even though you interact with them through a normal JS object

This is one reason `Buffer` is useful for binary data in Node.js.

**Do** `randomUUID()` **and** `randomInt()` **behave the same way?**

No.

- `crypto.randomBytes()` returns a `Buffer`, whose underlying byte storage is typically external to the main V8 heap
- `crypto.randomUUID()` returns a JavaScript string, which is V8-managed memory
- `crypto.randomInt()` returns a JavaScript number, which is also V8-managed memory

So among these three, `randomBytes()` is the one that typically involves external binary memory through `Buffer`.

---

### 5. Digital Signatures

Sign data with a private key; verify with a public key.

**Where are digital signatures used?**

Digital signatures are used when you need to prove:

- who created the data (authenticity)
- that the data was not changed (integrity)
- that the signer cannot easily deny signing it (non-repudiation)

Common use cases:

- TLS/HTTPS certificates
- JWTs signed with private/public key pairs such as `RS256` or `ES256`
- Signed software packages, installers, and OS updates
- Git commit and tag signing
- Document signing such as PDFs and contracts
- Blockchain and cryptocurrency transactions

```js
const sign = crypto.createSign("SHA256");
sign.update("message");
const signature = sign.sign(privateKey, "hex");

const verify = crypto.createVerify("SHA256");
verify.update("message");
verify.verify(publicKey, signature, "hex"); // true/false
```

---

### 6. Key Derivation (PBKDF2 / scrypt)

Derive secure keys from passwords:

```js
const key = crypto.scryptSync("password", "salt", 64); // scrypt (recommended)
crypto.pbkdf2Sync("password", "salt", 100000, 64, "sha512"); // PBKDF2
```

---

## Interview Questions & Answers

---

### Conceptual Questions

---

**Q1. What is the difference between hashing and encryption?**

HashingEncryptionReversible?No (one-way)Yes (with key)Key needed?NoYesOutput sizeFixedVariableUse casePassword storage, integrity checksData confidentiality

- **Hash**: `"hello" → "2cf24dba..."` — you can never get `"hello"` back
- **Encryption**: `"hello" + key → "x7fG..."` → decrypt with key → `"hello"`

```js
// Hashing - one way
crypto.createHash("sha256").update("hello").digest("hex");

// Encryption - reversible
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
```

---

**Q2. Why is MD5/SHA1 not recommended for passwords?**

Two reasons:

1. **Too fast** — A GPU can compute billions of MD5/SHA1 hashes per second, making brute-force and dictionary attacks trivial.
2. **Collision vulnerabilities** — MD5 and SHA1 have known collision attacks (two different inputs producing the same hash).

```js
// BAD - fast, vulnerable
crypto.createHash("md5").update("password123").digest("hex");

// GOOD - slow by design, memory-hard
const hash = await bcrypt.hash("password123", 12);
// OR using built-in scrypt
crypto.scrypt("password123", salt, 64, (err, key) => {
	/* store key */
});
```

> Rule of thumb: Use **bcrypt**, **argon2**, or **scrypt** for passwords. Use SHA-256/SHA-512 only for data integrity (file checksums, signatures).

---

**Q3. What is a salt and why do we use it?**

A **salt** is a random value appended/prepended to a password before hashing.

**Problem without salt:**

```
"password123" → always → "ef92b778..."  ← same hash every time
```

An attacker can precompute a **rainbow table** (hash → password lookup) and instantly crack it.

**With salt:**

```
"password123" + "xK9#mP2q" → unique hash
"password123" + "aB7$nL5w" → completely different hash
```

```js
const salt = crypto.randomBytes(16).toString("hex"); // unique per user
const hash = crypto
	.createHash("sha256")
	.update(password + salt)
	.digest("hex");
// store both salt and hash in DB
```

> Each user gets a **unique salt**, so even if two users have the same password, their hashes differ. Rainbow tables become useless.

---

**Q4. What is the difference between symmetric and asymmetric encryption?**

SymmetricAsymmetricKeysOne shared keyPublic + Private key pairSpeedFastSlowKey sharing problemYes (how to share the key securely?)NoUse caseBulk data encryptionKey exchange, signatures, TLS handshakeAlgorithmsAES, DESRSA, ECC

```js
// Symmetric - same key encrypts and decrypts
const key = crypto.randomBytes(32); // must share this securely
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

// Asymmetric - public key encrypts, private key decrypts
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
const encrypted = crypto.publicEncrypt(publicKey, Buffer.from("hello"));
const decrypted = crypto.privateDecrypt(privateKey, encrypted);
```

> **Real world**: TLS uses asymmetric encryption to securely exchange a symmetric key, then uses that symmetric key for the rest of the session (best of both worlds).

---

**Q5. What is an IV (Initialization Vector) and why is it needed?**

An IV is a random value used alongside the key to ensure that **encrypting the same plaintext twice produces different ciphertext**.

**Without IV (ECB mode — bad):**

```
"hello" + key → "aabbcc"
"hello" + key → "aabbcc"  ← identical! patterns leak
```

**With IV (CBC mode — good):**

```
"hello" + key + iv1 → "xK92mP"
"hello" + key + iv2 → "bN47qR"  ← different every time
```

```js
const iv = crypto.randomBytes(16); // new IV for every encryption
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// Store IV alongside ciphertext (IV is NOT secret, just must be unique)
const result = { iv: iv.toString('hex'), encrypted: cipher.update(...) + cipher.final(...) };
```

> IV does **not** need to be secret — it just needs to be **unique per encryption**. Store it with the ciphertext.

---

**Q6. What is the difference between HMAC and a regular hash?**

HashHMACKey needed?NoYes (secret key)Provides integrity?YesYesProvides authenticity?NoYesForgeable?Yes (anyone can hash)No (need the secret key)

```js
// Regular hash - anyone can compute this
crypto.createHash("sha256").update("data").digest("hex");

// HMAC - only someone with the secret key can compute/verify
crypto.createHmac("sha256", "my-secret-key").update("data").digest("hex");
```

> **Use case**: JWTs use HMAC-SHA256 to sign tokens. The server holds the secret key — so only the server can create valid signatures, and it can verify tokens weren't tampered with.

---

### Practical / Code-Based Questions

---

**Q7. How would you hash a password securely in Node.js?**

```js
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString("hex");
	const derivedKey = await scrypt(password, salt, 64);
	return `${salt}:${derivedKey.toString("hex")}`; // store this in DB
}

async function verifyPassword(password, stored) {
	const [salt, storedHash] = stored.split(":");
	const derivedKey = await scrypt(password, salt, 64);
	const newHash = Buffer.from(derivedKey.toString("hex"));
	const storedBuf = Buffer.from(storedHash);
	return crypto.timingSafeEqual(newHash, storedBuf); // timing-safe compare
}

// Usage
const stored = await hashPassword("myPassword123");
const isValid = await verifyPassword("myPassword123", stored); // true
```

---

**Q8. How do you encrypt and decrypt a string using AES?**

```js
const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const KEY = crypto.randomBytes(32); // 256-bit key — store this securely!

function encrypt(text) {
	const iv = crypto.randomBytes(16); // new IV every time
	const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
	const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
	return `${iv.toString("hex")}:${encrypted}`; // store IV with ciphertext
}

function decrypt(data) {
	const [ivHex, encrypted] = data.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
	return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}

const encrypted = encrypt("sensitive data");
const decrypted = decrypt(encrypted); // "sensitive data"
```

---

**Q9. How would you generate a secure random token for password reset?**

```js
const crypto = require("crypto");

// Option 1: hex token
function generateResetToken() {
	return crypto.randomBytes(32).toString("hex"); // 64-char hex string
}

// Option 2: URL-safe base64
function generateUrlSafeToken() {
	return crypto.randomBytes(32).toString("base64url"); // ~43 chars, URL safe
}

// Option 3: UUID
const token = crypto.randomUUID(); // "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"

// Store hashed token in DB, send raw token in email
const rawToken = generateResetToken();
const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
// Save hashedToken to DB with expiry; email rawToken to user
```

> Never store the raw token in DB — store its hash. When user submits, hash their token and compare.

---

**Q10. What's the difference between** `crypto.randomBytes` **and** `Math.random`**?**

`Math.random()crypto.randomBytes()`TypePRNG (Pseudo-Random)CSPRNG (Cryptographically Secure)Predictable?Yes, if seed is knownNoUse for security?NeverYesAsync supportN/AYes

```js
// NEVER use for security
Math.random(); // predictable, can be reverse-engineered

// ALWAYS use for tokens, keys, IVs, salts
crypto.randomBytes(16); // cryptographically secure
crypto.randomInt(1, 100); // secure random integer
crypto.randomUUID(); // secure UUID
```

> `Math.random()` is seeded deterministically — an attacker who observes enough outputs can predict future values. `crypto.randomBytes` uses OS-level entropy sources (`/dev/urandom` on Linux).

---

**Q11. How do you verify a JWT signature manually?**

A JWT is `base64(header).base64(payload).HMAC_SHA256(header.payload, secret)`

```js
const crypto = require("crypto");

function verifyJWT(token, secret) {
	const [headerB64, payloadB64, signatureB64] = token.split(".");

	// Recompute signature
	const data = `${headerB64}.${payloadB64}`;
	const expectedSig = crypto
		.createHmac("sha256", secret)
		.update(data)
		.digest("base64url");

	// Timing-safe comparison
	const sigBuffer = Buffer.from(signatureB64);
	const expectedBuffer = Buffer.from(expectedSig);

	if (sigBuffer.length !== expectedBuffer.length) return null;
	if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

	// Decode payload
	return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
}
```

---

### Security / Gotchas

---

**Q12. Why should you never reuse an IV?**

If you use the **same key + same IV** twice with AES-CBC:

```
Encrypt("attack at dawn", key, iv)  → C1
Encrypt("attack at noon", key, iv)  → C2

C1 XOR C2 reveals patterns about the plaintexts!
```

An attacker can XOR two ciphertexts encrypted with the same key+IV to learn about the original messages. This is called a **two-time pad attack**.

```js
// WRONG - reusing IV
const iv = Buffer.alloc(16, 0); // fixed IV - never do this

// CORRECT - fresh IV every time
const iv = crypto.randomBytes(16); // unique per encryption
```

---

**Q13. What is a timing attack and how does** `timingSafeEqual` **help?**

A **timing attack** exploits the fact that `===` short-circuits — it returns `false` as soon as it finds a mismatch.

```js
// VULNERABLE
if (userToken === storedToken) { ... }
// If first char matches, comparison takes slightly longer
// Attacker measures response times → deduces correct token char by char
```

`crypto.timingSafeEqual` always takes the **same time** regardless of where strings differ:

```js
// SAFE - constant time comparison
const a = Buffer.from(userToken);
const b = Buffer.from(storedToken);

if (a.length !== b.length) return false; // length check first (can't be avoided)
crypto.timingSafeEqual(a, b); // always compares all bytes
```

> Use `timingSafeEqual` whenever comparing secrets, tokens, HMACs, or hashes.

---

**Q14. What is ECB mode and why is it dangerous?**

ECB (Electronic Codebook) encrypts each block independently with the same key and **no IV**.

```
Block 1: "AAAA" + key → "X1X1"
Block 2: "AAAA" + key → "X1X1"  ← identical blocks produce identical output!
```

This leaks patterns from the original data — famously visible in the "ECB penguin":

```js
// NEVER use ECB
crypto.createCipheriv("aes-256-ecb", key, null); // no IV needed = red flag

// Use CBC or GCM instead
crypto.createCipheriv("aes-256-cbc", key, iv);
crypto.createCipheriv("aes-256-gcm", key, iv); // GCM is even better
```

---

**Q15. What is key stretching?**

Key stretching makes a weak password into a strong cryptographic key by running it through an intentionally **slow** algorithm thousands of times.

```js
// PBKDF2 - 100,000 iterations
crypto.pbkdf2("password", salt, 100_000, 64, "sha512", (err, key) => {
	// key is now 64-byte derived key
});

// scrypt - memory-hard (harder to parallelize on GPUs)
crypto.scrypt("password", salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
	// N = CPU/memory cost, r = block size, p = parallelization
});
```

> Goal: Make a single hash attempt take \~100ms on your server. That's fine for login, but makes brute-forcing billions of attempts take centuries.

---

### Senior-Level Questions

---

**Q16. AES-GCM (authenticated) vs AES-CBC (unauthenticated)?**

AES-CBCAES-GCMEncryptionYesYesAuthentication tagNoYes (16 bytes)Detects tampering?NoYesPadding required?YesNo

```js
// AES-GCM - encrypts AND authenticates
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
cipher.update(plaintext, "utf8", "hex");
const encrypted = cipher.final("hex");
const authTag = cipher.getAuthTag(); // save this!

// Decryption fails if data was tampered with
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(authTag); // will throw if tag doesn't match
```

> **Always prefer AES-GCM** — with CBC, an attacker can flip bits in ciphertext and it decrypts silently to garbage. GCM detects this and throws an error.

---

**Q17. When to use asymmetric vs symmetric encryption?**

ScenarioUseEncrypting large data (files, DB)Symmetric (AES) — fastSecurely exchanging a symmetric keyAsymmetric (RSA/ECDH)Digital signaturesAsymmetric (RSA/ECDSA)TLS handshakeAsymmetric to agree on symmetric keyJWT signingSymmetric (HS256) or Asymmetric (RS256/ES256)

> **Hybrid approach**: Use RSA to encrypt an AES key, then use AES to encrypt the actual data. This is what TLS does.

---

**Q18. What is forward secrecy?**

If an attacker records all your encrypted traffic today, and later steals your private key — **can they decrypt past sessions?**

- **Without forward secrecy**: Yes — they use your long-term private key to decrypt everything.
- **With forward secrecy**: No — each session uses a fresh **ephemeral key** that is discarded after the session.

```js
// ECDH key exchange - generates ephemeral keys per session
const alice = crypto.createECDH("prime256v1");
const alicePublic = alice.generateKeys();

const bob = crypto.createECDH("prime256v1");
const bobPublic = bob.generateKeys();

// Both arrive at the same shared secret without transmitting it
const aliceSecret = alice.computeSecret(bobPublic);
const bobSecret = bob.computeSecret(alicePublic);
// aliceSecret === bobSecret - use this as AES key for session
```

> TLS 1.3 enforces forward secrecy by default using ephemeral ECDH (ECDHE).

---

**Q19. How would you design a secrets rotation system?**

```
┌─────────────────────────────────────────────┐
│  Key Rotation Strategy                       │
│                                              │
│  1. Generate new key                         │
│  2. Mark old key as "deprecated"             │
│  3. Re-encrypt data with new key             │
│     (background job, not blocking)           │
│  4. Delete old key after grace period        │
└─────────────────────────────────────────────┘
```

```js
// Store key version alongside ciphertext
function encrypt(text, keyVersion = "v2") {
	const key = getKey(keyVersion); // fetch from KMS/vault
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	// ...
	return { keyVersion, iv: iv.toString("hex"), encrypted, authTag };
}

function decrypt(data) {
	const key = getKey(data.keyVersion); // use whatever key encrypted it
	// ...
}

// Background job
async function rotateKeys() {
	const oldRecords = await db.find({ keyVersion: "v1" });
	for (const record of oldRecords) {
		const plaintext = decrypt(record); // decrypt with old key
		const newData = encrypt(plaintext, "v2"); // re-encrypt with new key
		await db.update(record.id, newData);
	}
}
```

> In production, use a **KMS** (AWS KMS, HashiCorp Vault, GCP Cloud KMS) — never manage raw keys yourself.

---

## Quick Reference Cheat Sheet

```
Password storage     → scrypt / bcrypt / argon2
Data encryption      → AES-256-GCM
Secure tokens        → crypto.randomBytes(32)
Data integrity       → SHA-256 hash
API authentication   → HMAC-SHA256
Key exchange         → ECDH (ephemeral)
Digital signatures   → RSA-SHA256 or ECDSA
Compare secrets      → crypto.timingSafeEqual()
```
