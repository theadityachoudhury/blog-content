---
title: "Node.js `child_process` & Cluster — Complete Interview Guide"
date: 2026-03-25
description: "Everything about Node.js child_process and Clusters"
tags: [Node.js, Javascript]
draft: false
---
# Node.js `child_process` & Cluster — Complete Interview Guide

---

## Part 1: child_process Overview

### What is `child_process`?

Node.js is **single-threaded**, but it can spawn **separate OS-level processes** to run tasks in parallel or execute system commands. The `child_process` module provides this capability.

> Node app is the parent, children do heavy/blocking work without freezing the main thread.

---

## Part 2: Buffering vs Streaming

**Imagine you ordered 100 pages of a printed document:**

- **Buffered (exec)**: Printer prints ALL 100 pages, staples them, hands you the entire stack at once.
- **Streamed (spawn)**: Printer hands you each page AS IT COMES OUT.

```
BUFFERED (exec):
Process runs ──────────────────────> ALL output collected ──> callback fires once

STREAMED (spawn):
Process runs ──> chunk1 ──> chunk2 ──> chunk3 ──> ...
                  |           |           |
               you get it  you get it  you get it  (in real time)
```

---

## Part 3: The 4 Core Methods

### 1. `exec` — Shell + Buffered

```js
const { exec } = require('child_process');

exec('ls -la', (error, stdout, stderr) => {
    if (error) { console.error('Error:', error.message); return; }
    console.log(stdout); // prints everything at once
});
```

- Runs a shell command (`/bin/sh -c "..."`)
- Buffers entire output — bad for large output (default limit: 1MB)
- Supports shell features: pipes `|`, wildcards `*`, env vars `$HOME`
- **DANGEROUS with user input** — shell injection risk

---

### 2. `execFile` — No Shell + Buffered

```js
const { execFile } = require('child_process');

execFile('ls', ['-l', '-a'], (error, stdout, stderr) => {
    console.log(stdout);
});
```

- Binary and arguments are **separate** — no shell interpretation
- **More secure** — user input cannot become shell commands
- Same buffering limitation as `exec`

---

### 3. `spawn` — No Shell + Streamed

```js
const { spawn } = require('child_process');

const child = spawn('ping', ['google.com']);

child.stdout.on('data', (chunk) => {
    console.log('Got chunk:', chunk.toString()); // fires per chunk, not at end
});

child.stderr.on('data', (chunk) => console.error(chunk.toString()));
child.on('close', (code) => console.log(`Exit code: ${code}`));
```

- Returns a **stream** — data arrives chunk by chunk
- No memory accumulation — handles 1GB+ output fine
- Best for large output or long-running processes

---

### 4. `fork` — Node.js Only + IPC Channel

```js
// parent.js
const { fork } = require('child_process');
const child = fork('./worker.js');

child.send({ numbers: [1, 2, 3, 4, 5] }); // parent -> child via IPC
child.on('message', (result) => console.log('Result:', result)); // child -> parent
```

```js
// worker.js (separate Node.js process, own memory)
process.on('message', (data) => {
    const sum = data.numbers.reduce((a, b) => a + b, 0);
    process.send({ sum });
    process.exit(0);
});
```

- Spawns a **new V8 instance** with its own memory
- Automatically sets up **IPC channel** (two-way messaging)
- Only works with `.js` files

---

### Quick Comparison Table

| Method | Shell? | Output | IPC? | Best For |
|--------|--------|--------|------|----------|
| `exec` | Yes | Buffered | No | Simple shell commands |
| `execFile` | No | Buffered | No | Direct binary, secure |
| `spawn` | No | Streamed | No | Large output, long-running |
| `fork` | No | Streamed | **Yes** | Node scripts + communication |

---

## Part 4: child_process Interview Questions & Answers

### Basic Level

**Q1. What is the `child_process` module and why does Node.js need it?**

Node.js is single-threaded — it runs on one CPU core and cannot do CPU-intensive work without blocking the event loop. The `child_process` module lets Node spawn separate OS-level processes to run shell commands, offload CPU-heavy computation, and execute other Node.js scripts in isolation. Each child is a **fully independent OS process** — its own memory, its own PID, its own event loop.

---

**Q2. What are the 4 methods of `child_process` and the difference between them?**

| Method | Shell? | Output | IPC? |
|--------|--------|--------|------|
| `exec` | Yes | Buffered (all at once) | No |
| `execFile` | No | Buffered (all at once) | No |
| `spawn` | No | Streamed (chunk by chunk) | No |
| `fork` | No | Streamed | Yes (built-in) |

---

**Q3. What does "buffered output" mean in `exec`?**

Node.js waits for the child to completely finish, collects ALL output into memory, then hands it to your callback as one big string. Default limit is **1MB** — exceed it and the process errors out. The right fix for large output is `spawn` — no accumulation in memory.

```js
exec('command', { maxBuffer: 1024 * 1024 * 50 }, callback); // increase to 50MB
```

---

**Q4. What is the default `maxBuffer` in `exec` and what happens if exceeded?**

Default is **1MB**. If exceeded, Node kills the child and calls callback with an error:

```js
exec('cat huge_file.log', (err, stdout) => {
    console.log(err.message); // "stdout maxBuffer length exceeded"
    console.log(err.killed);  // true
});
```

---

**Q5. Why is `execFile` more secure than `exec`?**

`exec` passes command to a shell — enables shell injection with user input. `execFile` skips the shell — arguments are passed as an array, treated literally. Rule: **Never use `exec` with user-controlled input.**

```js
// DANGEROUS
exec(`ls ${userInput}`); // userInput = '; rm -rf /' -> runs rm -rf /

// SAFE
execFile('ls', [userInput]); // ls says "no such file" — rm never runs
```

---

### Intermediate Level

**Q6. When would you use `spawn` over `exec`?**

Use `spawn` when output is large, process is long-running, you need to pipe output to another stream, or you need to write to child's stdin.

```js
// Real-time log tailing
const tail = spawn('tail', ['-f', 'app.log']);
tail.stdout.on('data', (chunk) => process.stdout.write(chunk));

// Piping — no memory usage
const child = spawn('ffmpeg', ['-i', 'input.mp4', 'output.mp3']);
child.stdout.pipe(fs.createWriteStream('output.mp3'));
```

---

**Q7. What is the `stdio` option in `spawn` and what are its values?**

Controls how parent and child standard streams are connected:

```js
spawn('ls', [], { stdio: 'pipe' })    // default — capture via streams
spawn('ls', [], { stdio: 'inherit' }) // child uses parent's terminal
spawn('ls', [], { stdio: 'ignore' })  // discard all output

// Array form — fine-grained control per stream
spawn('cmd', [], { stdio: ['pipe', 'inherit', 'pipe'] })
//                          stdin   stdout     stderr
```

---

**Q8. What is IPC and how does `fork` enable it?**

IPC (Inter-Process Communication) is a channel that allows two separate processes to send messages to each other. `fork()` automatically creates this channel — no other method does this. Messages are serialized as JSON automatically.

```js
child.send({ type: 'START' });           // parent -> child
child.on('message', (msg) => { ... });   // child -> parent

process.on('message', (msg) => { ... }); // in worker: receive from parent
process.send({ result: 42 });            // in worker: send to parent
```

---

**Q9. What happens when you call `child.kill()`? What signals can you pass?**

```js
child.kill();           // sends SIGTERM (default) — graceful, catchable
child.kill('SIGTERM');  // graceful — process can clean up and exit
child.kill('SIGKILL');  // forceful — OS kills immediately, uncatchable
```

SIGTERM first. SIGKILL only as last resort if SIGTERM times out.

---

**Q10. How do you set a timeout on a child process?**

For `exec`/`execFile`:
```js
exec('slow-command', { timeout: 5000 }, (err) => {
    if (err?.killed) console.log('Timed out');
});
```

For `spawn` — manual:
```js
const child = spawn('slow-command', []);
const timer = setTimeout(() => {
    child.kill('SIGTERM');
    setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 2000);
}, 5000);
child.on('close', () => clearTimeout(timer));
```

---

### Advanced Level

**Q11. Do child processes share memory with the parent?**

**No.** Each child process has its own memory space. Variables in the parent are not accessible in the child. To share data: use IPC messages, files, databases, or Redis.

---

**Q12. What is the `detached` option in `spawn` and when would you use it?**

By default, child exits when parent exits. `detached: true` makes the child independent — it can outlive the parent. Use for background jobs and daemons.

```js
const child = spawn('node', ['background-job.js'], {
    detached: true,
    stdio: 'ignore'
});
child.unref(); // critical — lets parent exit without waiting for child
```

---

**Q13. How do you run multiple child processes in parallel?**

```js
const { promisify } = require('util');
const execAsync = promisify(exec);

const [r1, r2, r3] = await Promise.all([
    execAsync('node task1.js'),
    execAsync('node task2.js'),
    execAsync('node task3.js'),
]);
```

---

**Q14. What is the difference between `exit` and `close` events?**

```js
child.on('exit', (code) => {
    // Process exited — but stdio streams may still be flushing
});

child.on('close', (code) => {
    // Process exited AND all streams are closed — all output received
    // Always use this if you need the full output
});
```

---

**Q15. How does `child_process.fork` differ from the Cluster module?**

`cluster.fork()` is built on `child_process.fork()` but adds shared port (master owns it, distributes connections via IPC), built-in Round Robin load balancing, and worker lifecycle management.

```js
// child_process.fork — two workers CONFLICT on same port
fork('./server.js'); // binds :3000
fork('./server.js'); // EADDRINUSE

// cluster.fork — master manages port, no conflict
cluster.fork(); // worker 1
cluster.fork(); // worker 2
```

---

## Part 5: Cluster Module

### Why Cluster Exists

Node.js is single-threaded — one process uses only 1 CPU core. Cluster spawns multiple workers, each on its own core, all sharing the same port.

### Cluster is Built on `fork`

```
cluster.fork()
    --> calls child_process.fork() internally
            --> spawns new Node.js process
                    --> sets up IPC channel automatically
```

### How Workers Share a Port

Master owns the port. When a connection arrives, master sends it to a worker via IPC. Workers cannot communicate directly — all messages go through master.

### Basic Cluster Setup

```js
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker) => {
        if (!worker.exitedAfterDisconnect) cluster.fork();
    });
} else {
    require('./server');
}
```

---

## Part 6: Cluster Interview Questions & Answers

**Q1. What is the Cluster module and why do we need it?**
Node.js uses only 1 CPU core. Cluster spawns one worker per core, all handling requests on the same port — multiplies throughput proportional to CPU count.

**Q2. How many workers should you create?**
`os.cpus().length` — one per logical CPU core. More = context switching overhead. Exception: I/O-heavy workers can slightly exceed core count.

**Q3. How does load balancing work?**
Round Robin (default, non-Windows): W1, W2, W3, W1... OS-level (Windows): OS decides — less predictable. Configure via `cluster.schedulingPolicy`.

**Q4. How do you handle a worker crash?**
```js
cluster.on('exit', (worker) => {
    if (!worker.exitedAfterDisconnect) cluster.fork();
    // exitedAfterDisconnect=false means crash, true means intentional
});
```

**Q5. How do you do a zero-downtime restart?**
Disconnect workers one at a time, fork a replacement, wait for it to be listening before moving to the next.

**Q6. Do workers share memory?**
No. Use Redis or external storage for shared state.

**Q7. `cluster.isPrimary` vs `cluster.isMaster`?**
Same thing. `isMaster` deprecated in Node.js v16. Always use `isPrimary`.

**Q8. Cluster vs Worker Threads?**

| | Cluster | Worker Threads |
|---|---|---|
| Isolation | Separate processes | Threads in same process |
| Memory sharing | No | Yes (SharedArrayBuffer) |
| Best for | HTTP server scaling | CPU-heavy JS computation |

**Q9. How does PM2 relate to Cluster?**
PM2 abstracts cluster. `pm2 start app.js -i max` calls `cluster.fork()` per core, handles auto-restart and zero-downtime reloads.

---

## Quick-Fire Cheat Sheet

```
exec          -> shell + buffered.  Simple commands. Shell injection risk.
execFile      -> no shell + buffered. Secure. Direct binary execution.
spawn         -> no shell + streamed. Large output. Long-running processes.
fork          -> spawn for .js files + IPC channel. 2-way communication.

maxBuffer     -> 1MB default in exec. Exceed it -> process killed.
SIGTERM       -> graceful kill. Process can catch and clean up.
SIGKILL       -> force kill. Cannot be caught. OS terminates immediately.
detached      -> child outlives parent. Use with child.unref().
stdio:inherit -> child output goes to terminal directly.
stdio:pipe    -> capture output via streams (default).
exit event    -> process died. Streams may still flush.
close event   -> process died AND all streams are closed. Safe to use.
No shared memory -> use IPC, files, or Redis to share state.

Cluster = cluster.fork() = child_process.fork() + shared port + load balancing
Workers cannot talk directly -> all messages go through master
isPrimary not isMaster       -> isMaster deprecated in Node v16
exitedAfterDisconnect=false  -> crashed -> restart
exitedAfterDisconnect=true   -> intentional shutdown -> don't restart
```
