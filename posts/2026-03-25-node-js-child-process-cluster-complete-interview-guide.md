---
title: "Node.js `child_process` & Cluster — Complete Interview Guide"
date: 2026-03-25
description: "Everything about Node.js child_process and Clusters"
tags: [Node.js, Javascript]
draft: false
---
# Node.js `child_process` & Cluster — Complete Interview Guide

---

## Part 1: What is `child_process`?

Node.js is **single-threaded**, but it can spawn **separate OS-level processes** to run tasks in parallel or execute system commands. The `child_process` module provides this capability.

> Think of it as: your Node app is the parent, and it can create children to do heavy/blocking work without freezing the main thread.

---

## Part 2: Buffering vs Streaming (Key Concept)

**Imagine you ordered 100 pages of a printed document:**

- **Buffered (exec)**: The printer prints ALL 100 pages, staples them, then hands you the entire stack at once. You wait until everything is done.
- **Streamed (spawn)**: The printer hands you each page AS IT COMES OUT. You can start reading page 1 while pages 2-100 are still printing.

In code terms:
- **Buffer** = Node.js collects ALL output from the process into memory first, then gives it to you when done.
- **Stream** = Node.js gives you the output in **chunks, as it arrives**, piece by piece.

```
BUFFERED (exec):
Process runs ──────────────────────> ALL output collected ──> callback fires once

STREAMED (spawn):
Process runs ──> chunk1 ──> chunk2 ──> chunk3 ──> ...
                  |           |           |
               you get it  you get it  you get it  (in real time)
```

---

## Part 3: The 4 Core Methods — In Depth

---

### 1. `exec` — Shell + Buffered

**Real world analogy**: You ask your assistant "go run this errand and tell me everything that happened". They leave, do everything, come back, and give you the full report.

```js
const { exec } = require('child_process');

exec('ls -la', (error, stdout, stderr) => {
    // This callback fires ONLY ONCE, after the command fully finishes
    // stdout = ALL the output collected together as one big string
    // stderr = ALL the error output collected together
    // error  = null if success, Error object if it failed

    if (error) {
        console.error('Something went wrong:', error.message);
        return;
    }

    console.log(stdout); // prints everything at once
});

console.log('This prints IMMEDIATELY, before exec finishes');
// exec is non-blocking — it does not pause your code
```

**The buffering problem — why it matters:**

```js
// Imagine this command produces 500MB of output (like reading a huge log file)
exec('cat huge_log_file.txt', (error, stdout) => {
    // Node.js stored ALL 500MB in RAM just to give it to you here
    // Your server just ran out of memory!
    console.log(stdout);
});
```

**The 1MB default limit:**
```js
// If output exceeds maxBuffer, it KILLS the process with an error
exec('some-large-output-command', { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
    // you can increase it (here: 10MB), but it is still all in RAM
    if (err?.killed) console.log('Process was killed — output too large');
});
```

**exec spawns a shell — what does that mean?**
```js
// exec runs: /bin/sh -c "ls -la | grep txt"
// Because it uses a shell, you can use shell features like:
exec('ls -la | grep .txt');    // pipe operator
exec('echo $HOME');            // env variables
exec('ls *.js');               // wildcards/globs

// This is convenient but DANGEROUS with user input:
const userInput = '; rm -rf /';     // malicious input
exec(`ls ${userInput}`);            // runs: ls ; rm -rf /  <- DELETES EVERYTHING
```

---

### 2. `execFile` — No Shell + Buffered

Same as exec BUT instead of asking a shell to interpret your command, you run the program directly.

```js
const { execFile } = require('child_process');

// WRONG way to think about it:  execFile('ls -la')  <- this will FAIL
// RIGHT way:  binary and arguments are SEPARATE

execFile('ls', ['-l', '-a'], (error, stdout, stderr) => {
    // Same callback style as exec
    // stdout = all output buffered into memory, given at once
    console.log(stdout);
});
```

**Why no shell = more secure:**
```js
// With execFile, args are passed as an array — they can NEVER become shell commands
const userInput = '; rm -rf /';

execFile('ls', [userInput], (err, stdout) => {
    // Node passes this literally to the ls binary
    // ls just says "no such file or directory: ; rm -rf /"
    // The malicious command NEVER runs
});
```

**When to use execFile over exec:**
```js
// Running a specific binary with known arguments -> execFile
execFile('ffmpeg', ['-i', 'input.mp4', 'output.mp3'], (err, stdout) => {
    console.log('Conversion done');
});

// Running shell commands with pipes/wildcards -> exec
exec('find . -name "*.log" | wc -l', (err, stdout) => {
    console.log('Log file count:', stdout.trim());
});
```

---

### 3. `spawn` — No Shell + Streamed

**Real world analogy**: You have a live sports game. Instead of waiting for the game to end to watch the highlights (buffered), you watch it LIVE as it happens (streamed).

```js
const { spawn } = require('child_process');

const child = spawn('ping', ['google.com']);
// ping runs FOREVER — exec/execFile would wait forever too
// But with spawn, we get data as it arrives:

child.stdout.on('data', (chunk) => {
    // chunk is a Buffer — convert to string
    // This fires every time NEW data comes in, not at the end
    console.log('Got chunk:', chunk.toString());
});

child.stderr.on('data', (chunk) => {
    console.error('Error chunk:', chunk.toString());
});

child.on('close', (code) => {
    // fires when the process finishes
    console.log(`Process exited with code ${code}`);
});
```

**Why spawn is better for large output:**
```js
// Reading a 1GB log file — spawn handles this perfectly
const child = spawn('cat', ['huge_file.log']);

const writeStream = fs.createWriteStream('output.txt');

// We are PIPING: data flows from child process -> directly to file
// At no point is 1GB sitting in RAM
child.stdout.pipe(writeStream);

child.on('close', () => console.log('Done! File written.'));

// With exec, Node would try to store 1GB in memory — server crashes
// With spawn, it flows through in small chunks — memory stays low
```

**Spawn with stdin (sending input TO the process):**
```js
const child = spawn('python3', ['-c', 'import sys; print(sys.stdin.read().upper())']);

// You can WRITE to the child's stdin
child.stdin.write('hello world');
child.stdin.end(); // signal: no more input

child.stdout.on('data', (data) => {
    console.log(data.toString()); // HELLO WORLD
});
```

---

### 4. `fork` — Node.js Only + IPC Channel

**Real world analogy**: You clone yourself. Your clone has their own brain (memory), does heavy work independently, and you two can talk to each other via walkie-talkie (`send` / `on('message')`).

```js
// parent.js
const { fork } = require('child_process');

// fork ONLY works with .js files (Node.js scripts)
const child = fork('./worker.js');

// Send a message TO the child via the IPC channel
child.send({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

// Listen for messages FROM the child
child.on('message', (result) => {
    console.log('Child computed:', result); // { sum: 55 }
});

child.on('exit', (code) => {
    console.log('Worker finished, exit code:', code);
});

// This runs WITHOUT WAITING for the child
console.log('Parent is free to do other things...');
```

```js
// worker.js  (this runs in a COMPLETELY SEPARATE Node.js process)
process.on('message', (data) => {
    // Do heavy CPU work here — it will NOT block the parent's event loop
    const sum = data.numbers.reduce((a, b) => a + b, 0);

    // Send result back to parent
    process.send({ sum });

    process.exit(0); // done
});
```

**Why fork exists — the real use case:**

```js
// PROBLEM: Heavy computation blocks Node's event loop
app.get('/compute', (req, res) => {
    let sum = 0;
    for (let i = 0; i < 10_000_000_000; i++) sum += i; // 10 billion iterations
    // During this loop, NO OTHER REQUEST can be handled — server is frozen
    res.json({ sum });
});

// SOLUTION: Offload to a forked child process
app.get('/compute', (req, res) => {
    const child = fork('./computeWorker.js');
    child.send({ limit: 10_000_000_000 });
    child.on('message', (result) => res.json(result));
    // Parent's event loop is FREE — other requests still work
});
```

---

### Visual Summary — All 4 Methods

```
exec('ls -la', cb)
|
|-- spawns: /bin/sh -c "ls -la"
|-- waits for it to fully finish
|-- stores ALL output in memory (buffer)
|-- calls cb(error, stdout, stderr) ONCE with everything


execFile('ls', ['-la'], cb)
|
|-- spawns: ls -la  (no shell)
|-- waits for it to fully finish
|-- stores ALL output in memory (buffer)
|-- calls cb(error, stdout, stderr) ONCE with everything


spawn('ls', ['-la'])
|
|-- spawns: ls -la  (no shell)
|-- returns a ChildProcess object immediately
|-- data arrives in CHUNKS via events
|-- .stdout.on('data', chunk => ...)  fires multiple times


fork('./worker.js')
|
|-- spawns: node worker.js  (new V8 instance)
|-- returns a ChildProcess object immediately
|-- sets up a 2-way IPC channel automatically
|-- parent.send(msg)  ------->  worker.js
|-- child.on('message', result => ...) <------- process.send(result)
```

### Quick Comparison Table

| Method | Shell? | Output | IPC? | Best For |
|--------|--------|--------|------|----------|
| `exec` | Yes | Buffered | No | Simple shell commands |
| `execFile` | No | Buffered | No | Direct binary, secure |
| `spawn` | No | Streamed | No | Large output, long-running |
| `fork` | No | Streamed | **Yes** | Node scripts + communication |

### Decision Rule

```
Need shell features (pipes, wildcards)?  -> exec
Running a binary securely?               -> execFile
Large output or long-running process?    -> spawn
Running a Node.js file + need to talk?  -> fork
```

---

## Part 4: child_process Interview Questions & Answers

### Basic Level

---

**Q1. What is the `child_process` module and why does Node.js need it?**

Node.js is single-threaded — it runs on one CPU core and cannot do CPU-intensive work without blocking the event loop. The `child_process` module lets Node spawn separate OS-level processes to:
- Run shell commands (`ls`, `ffmpeg`, `python`, etc.)
- Offload CPU-heavy computation without blocking the main thread
- Execute other Node.js scripts in isolation

Each child is a **fully independent OS process** — its own memory, its own PID, its own event loop.

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

Node.js waits for the child to completely finish, collects ALL output into memory, then hands it to your callback as one big string. Default limit is **1MB** — exceed it and the process errors out.

```js
exec('command', { maxBuffer: 1024 * 1024 * 50 }, callback); // increase to 50MB
```

The right fix for large output is `spawn` — data flows in chunks, never accumulates in memory.

---

**Q4. What is the default `maxBuffer` in `exec` and what happens if exceeded?**

Default is **1MB**. If exceeded, Node kills the child and calls callback with an error:

```js
exec('cat huge_file.log', (err, stdout) => {
    console.log(err.message); // "stdout maxBuffer length exceeded"
    console.log(err.killed);  // true — process was killed
});
```

---

**Q5. Why is `execFile` more secure than `exec`?**

`exec` passes command to a shell — enables shell injection with user input. `execFile` skips the shell — arguments are passed as an array, treated literally.

```js
// DANGEROUS
exec(`ls ${userInput}`); // userInput = '; rm -rf /' -> runs rm -rf /

// SAFE
execFile('ls', [userInput]); // ls says "no such file" — rm never runs
```

Rule: **Never use `exec` with user-controlled input. Use `execFile` or `spawn` instead.**

---

### Intermediate Level

---

**Q6. When would you use `spawn` over `exec`?**

Use `spawn` when:
- Output is large (avoid memory issues)
- Process is long-running (need real-time data)
- Need to pipe output to another stream
- Need to write to child's stdin

```js
// Real-time log tailing — exec would wait forever
const tail = spawn('tail', ['-f', 'app.log']);
tail.stdout.on('data', (chunk) => process.stdout.write(chunk));

// Piping — zero memory overhead, data flows directly
const child = spawn('ffmpeg', ['-i', 'input.mp4', 'output.mp3']);
child.stdout.pipe(fs.createWriteStream('output.mp3'));

// Writing to child's stdin
const child = spawn('python3', ['script.py']);
child.stdin.write('some input data\n');
child.stdin.end();
child.stdout.on('data', (data) => console.log(data.toString()));
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
// stdin:  send data programmatically
// stdout: show in terminal directly
// stderr: capture in code
```

- **`pipe`** (default): Child streams connected to parent via Node.js streams. You can read `child.stdout`, `child.stderr`.
- **`inherit`**: Child output goes directly to terminal — you see it live but cannot capture it in code.
- **`ignore`**: Output is thrown away — equivalent to `/dev/null`.

---

**Q8. What is IPC and how does `fork` enable it?**

IPC (Inter-Process Communication) is a channel that allows two separate processes to send messages to each other. `fork()` automatically creates this channel — no other method does this.

Messages are serialized as JSON automatically — you send objects, you receive objects.

```js
child.send({ type: 'START' });           // parent -> child
child.on('message', (msg) => { ... });   // child -> parent

process.on('message', (msg) => { ... }); // in worker: receive from parent
process.send({ result: 42 });            // in worker: send to parent
```

Internally, Node creates a **pipe** between the two processes. The IPC channel is managed by Node.js itself.

---

**Q9. What happens when you call `child.kill()`? What signals can you pass?**

`child.kill()` sends a signal to the child process. Default signal is `SIGTERM`.

```js
const child = spawn('node', ['long-task.js']);

setTimeout(() => {
    child.kill();           // sends SIGTERM (default) — graceful, catchable
    child.kill('SIGTERM');  // graceful — process can catch and clean up
    child.kill('SIGKILL');  // forceful — OS kills immediately, uncatchable
}, 5000);

child.on('close', (code, signal) => {
    console.log(`Killed by signal: ${signal}`);
});
```

Child can catch SIGTERM to clean up gracefully:
```js
process.on('SIGTERM', () => {
    console.log('Cleaning up before exit...');
    cleanup();
    process.exit(0);
});
```

**SIGTERM** — try first. **SIGKILL** — last resort if SIGTERM times out.

---

**Q10. How do you set a timeout on a child process?**

For `exec`/`execFile` — use the `timeout` option:
```js
exec('slow-command', { timeout: 5000 }, (err) => {
    if (err?.killed) console.log('Process timed out and was killed');
});
```

For `spawn` — manual:
```js
const child = spawn('slow-command', []);

const timer = setTimeout(() => {
    child.kill('SIGTERM');
    // Force kill if it does not exit after grace period
    setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
    }, 2000);
}, 5000);

child.on('close', () => {
    clearTimeout(timer); // cancel timeout if it finishes naturally
});
```

---

### Advanced Level

---

**Q11. Do child processes share memory with the parent?**

**No.** Each child process is a completely separate OS process with its own memory space. Variables in the parent are not accessible in the child and vice versa.

```js
let counter = 0; // parent variable

const child = fork('./worker.js');

child.on('message', () => {
    counter++; // only the PARENT's counter changes
});

// Inside worker.js — has its own counter = 0
// Modifying anything in worker.js has ZERO effect on parent's memory
```

To share data between parent and child you must **explicitly communicate** via:
- IPC messages (`fork` only)
- Files
- Databases
- Redis (most common for production)

---

**Q12. What is the `detached` option in `spawn` and when would you use it?**

By default, a child process is tied to the parent — when the parent exits, the child exits too. `detached: true` makes the child **independent** — it can outlive the parent.

```js
const child = spawn('node', ['background-job.js'], {
    detached: true,
    stdio: 'ignore'  // child must not hold parent's stdio open
});

child.unref(); // parent can exit without waiting for child
```

**`child.unref()`** is critical — without it, the parent's event loop stays alive waiting for the child even though `detached: true`.

Use case: Background jobs, daemons, processes that should keep running after the Node app exits.

---

**Q13. How do you run multiple child processes in parallel?**

Promisify `exec`/`execFile` and use `Promise.all`:

```js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runParallel() {
    const [result1, result2, result3] = await Promise.all([
        execAsync('node task1.js'),
        execAsync('node task2.js'),
        execAsync('node task3.js'),
    ]);

    console.log(result1.stdout);
    console.log(result2.stdout);
    console.log(result3.stdout);
}
```

For `spawn`, wrap in a Promise manually:
```js
function spawnAsync(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args);
        let output = '';

        child.stdout.on('data', (chunk) => output += chunk);
        child.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Process exited with code ${code}`));
        });
        child.on('error', reject);
    });
}

await Promise.all([
    spawnAsync('node', ['task1.js']),
    spawnAsync('node', ['task2.js']),
]);
```

---

**Q14. What is the difference between `exit` and `close` events?**

```js
child.on('exit', (code, signal) => {
    // Fires when the PROCESS exits
    // But stdio streams may still be open (flushing remaining data)
    console.log('Process exited, code:', code);
});

child.on('close', (code, signal) => {
    // Fires when the process has exited AND all stdio streams are closed
    // Safe to assume all output has been received here
    console.log('All done, streams closed, code:', code);
});
```

**Rule**: Always use `close` if you need to process the full output. Use `exit` if you only care about the exit status.

The gap between `exit` and `close` exists because the child might write to stdout right before dying — Node needs to flush those bytes before closing the stream.

---

**Q15. How does `child_process.fork` differ from the Cluster module?**

`cluster.fork()` is built on `child_process.fork()` but adds extra features specifically for HTTP server scaling.

| | `child_process.fork` | `cluster.fork` |
|---|---|---|
| IPC channel | Yes | Yes (inherited from fork) |
| Shared server port | No — EADDRINUSE if two workers bind same port | Yes — master owns port, distributes connections |
| Worker management | Manual (restart on crash) | Built-in (`cluster.on('exit')`) |
| Load balancing | None | Round Robin or OS-level |
| Use case | General Node scripts, job workers | HTTP server scaling across CPU cores |

```js
// child_process.fork — two workers CONFLICT on same port
fork('./server.js'); // binds :3000
fork('./server.js'); // EADDRINUSE — port already in use

// cluster.fork — works perfectly, master manages port distribution
cluster.fork(); // worker 1 — no port conflict
cluster.fork(); // worker 2 — no port conflict
```

---

## Part 5: Cluster Module — In Depth

### Why Cluster Exists

Node.js is single-threaded. One process = uses only **1 CPU core**. If your server has 8 cores, 7 are sitting idle doing nothing.

```
Without cluster:
CPU Core 1  ##########  (your Node app)
CPU Core 2  ----------  (idle)
CPU Core 3  ----------  (idle)
...

With cluster:
CPU Core 1  ##########  (worker 1)
CPU Core 2  ##########  (worker 2)
CPU Core 3  ##########  (worker 3)
...
```

### Cluster is Built on `fork`

When you do `cluster.fork()`, Node internally calls `child_process.fork()` under the hood.

```
cluster.fork()
    --> calls child_process.fork() internally
            --> spawns new Node.js process
                    --> sets up IPC channel automatically
```

### How Workers Share a Port

The **master process owns the port**. Workers don't actually bind to the port themselves.

When a worker calls `server.listen(3000)`, cluster intercepts this call. The master is the one actually listening on port 3000. When a connection arrives, the master sends it to a worker via the **IPC channel**.

```
Client --> Master (owns :3000)
                |
                | picks a worker (Round Robin)
                | sends connection via IPC
                v
           Worker 1 (handles request)
```

### IPC Communication in Cluster

```js
// Worker -> Master
process.send({ type: 'REQUEST_COUNT', count: 42 });

// Master listening to all workers
cluster.on('message', (worker, message) => {
    console.log(`Worker ${worker.id} says:`, message);
});

// Master -> specific Worker
const worker = cluster.workers[workerId];
worker.send({ type: 'RELOAD_CONFIG', config: newConfig });

// Worker receiving from master
process.on('message', (msg) => {
    if (msg.type === 'RELOAD_CONFIG') applyConfig(msg.data);
});
```

Workers **cannot communicate directly** with each other — all messages must go through the master.

```
Worker 1 --> Master --> Worker 2   (indirect — only way)
Worker 1 X-----------> Worker 2   (direct — NOT possible)
```

### Basic Cluster Setup

```js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
    console.log(`Master PID: ${process.pid}`);

    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        if (!worker.exitedAfterDisconnect) {
            console.log('Restarting worker...');
            cluster.fork();
        }
    });

} else {
    http.createServer((req, res) => {
        res.end(`Handled by Worker PID: ${process.pid}`);
    }).listen(3000);

    console.log(`Worker PID: ${process.pid} started`);
}
```

---

## Part 6: Cluster Interview Questions & Answers

---

**Q1. What is the Cluster module and why do we need it?**

Node.js runs on a single thread — uses only 1 CPU core. On a multi-core machine, the rest of the cores sit idle. The `cluster` module lets you spawn multiple worker processes, each running on its own CPU core, all handling requests on the **same port**. This directly multiplies your server's throughput.

Without cluster → you waste N-1 cores. With cluster → all cores are utilized.

---

**Q2. How many workers should you create?**

The standard answer is `os.cpus().length` — one worker per logical CPU core.

```js
const numWorkers = os.cpus().length;
// On an 8-core machine -> 8 workers
```

**Why not more?** Creating more workers than cores causes **context switching overhead** — the OS spends time swapping processes in/out, which hurts performance.

**Why not fewer?** You leave cores idle, wasting resources.

**Exception**: If workers do heavy I/O (database calls, file reads), they spend most time waiting. In that case, slightly more workers than cores can help since idle workers do not burn CPU.

---

**Q3. What is the difference between `cluster.fork()` and `child_process.fork()`?**

`cluster.fork()` is built **on top of** `child_process.fork()`. Internally it calls `child_process.fork()`.

| | `child_process.fork()` | `cluster.fork()` |
|---|---|---|
| IPC channel | Yes | Yes (inherited) |
| Shared port | No | Yes (built-in) |
| Worker restart on crash | No | Yes (via events) |
| Load balancing | No | Yes |
| Use case | General scripts | HTTP server scaling |

`cluster.fork()` adds the shared port magic and worker lifecycle management on top of the raw `fork`.

---

**Q4. How do all workers share the same port without getting `EADDRINUSE`?**

The **master process owns the port**. Workers do not actually bind to the port themselves.

When a worker calls `server.listen(3000)`, cluster intercepts this call. The master is the one actually listening on port 3000. When a connection arrives, the master sends it to a worker via the **IPC channel**.

So from the OS perspective, only one process owns port 3000 — the master. Workers never actually bind to it.

---

**Q5. How does load balancing work in the Cluster module?**

Node.js uses **two scheduling strategies**:

**1. Round Robin** (default on all platforms except Windows):
Master distributes connections to workers in order — Worker1, Worker2, Worker3, Worker1, Worker2...

```js
cluster.schedulingPolicy = cluster.SCHED_RR; // Round Robin (default)
```

**2. OS-level distribution** (default on Windows):
Master passes the socket to the OS, which decides which worker gets it. Less predictable — can cause uneven distribution.

```js
cluster.schedulingPolicy = cluster.SCHED_NONE; // let OS decide
```

Round Robin is generally preferred because it is more predictable and even.

---

**Q6. How do you handle a worker crash and restart it automatically?**

The master listens for the `exit` event on the cluster and forks a new worker to replace the dead one.

```js
if (cluster.isPrimary) {
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        console.log(`Exit code: ${code}, Signal: ${signal}`);

        if (!worker.exitedAfterDisconnect) {
            // exitedAfterDisconnect = false means it CRASHED (not graceful shutdown)
            console.log('Restarting worker...');
            cluster.fork();
        }
    });
}
```

`worker.exitedAfterDisconnect`:
- `true` → master intentionally killed it (graceful shutdown) — do NOT restart
- `false` → it crashed unexpectedly — restart it

---

**Q7. How do workers communicate with the master?**

Via the **IPC channel** that `fork` sets up automatically.

```js
// Worker -> Master
process.send({ type: 'REQUEST_COUNT', count: 42 });

// Master listening to all workers
cluster.on('message', (worker, message) => {
    console.log(`Worker ${worker.id} says:`, message);
});

// Master -> specific Worker
const worker = cluster.workers[workerId];
worker.send({ type: 'RELOAD_CONFIG', config: newConfig });

// Worker receiving from master
process.on('message', (msg) => {
    if (msg.type === 'RELOAD_CONFIG') applyConfig(msg.config);
});
```

Workers cannot communicate directly with each other — all messages must go through the master.

---

**Q8. What is graceful shutdown in the context of clusters?**

Graceful shutdown means stopping a worker **without dropping active requests** — finish what is in progress, then exit.

```js
// Master triggers graceful shutdown of one worker
function gracefulShutdown(worker) {
    worker.send({ type: 'SHUTDOWN' });

    worker.disconnect(); // stop accepting new connections

    // Force kill if worker takes too long
    setTimeout(() => {
        if (!worker.isDead()) {
            worker.kill('SIGKILL');
        }
    }, 5000);
}

// Worker handles shutdown gracefully
process.on('message', (msg) => {
    if (msg.type === 'SHUTDOWN') {
        server.close(() => {
            // server.close waits for existing connections to finish
            process.exit(0);
        });
    }
});
```

This is important for **zero-downtime deployments** — you gracefully restart workers one by one.

---

**Q9. How do you do a zero-downtime restart/reload?**

Restart workers **one at a time**, ensuring at least one worker is always alive.

```js
function rollingRestart() {
    const workers = Object.values(cluster.workers);
    let index = 0;

    function restartNext() {
        if (index >= workers.length) {
            console.log('All workers restarted');
            return;
        }

        const worker = workers[index++];

        worker.disconnect(); // gracefully stop accepting connections

        worker.on('exit', () => {
            const newWorker = cluster.fork(); // start fresh worker
            newWorker.on('listening', () => {
                restartNext(); // only restart next AFTER new one is up
            });
        });
    }

    restartNext();
}

// Trigger on SIGUSR2 signal (common convention)
process.on('SIGUSR2', rollingRestart);
```

```bash
kill -SIGUSR2 <master_pid>   # triggers rolling restart
```

---

**Q10. Do workers share memory?**

**No.** Each worker is a completely separate OS process with its own V8 heap. They share **nothing in memory**.

```js
// This is WRONG thinking:
let requestCount = 0; // each worker has its OWN copy of this

app.get('/stats', (req, res) => {
    requestCount++;
    res.json({ count: requestCount }); // each worker returns different numbers!
});
```

To share state across workers, you need **external storage**:

```js
// RIGHT approach — use Redis
const redis = require('redis');
const client = redis.createClient();

app.get('/stats', async (req, res) => {
    await client.incr('requestCount');
    const count = await client.get('requestCount');
    res.json({ count }); // consistent across all workers
});
```

---

**Q11. What is the difference between Cluster and Worker Threads?**

| | Cluster | Worker Threads |
|---|---|---|
| Isolation | Separate processes | Threads in same process |
| Memory | No sharing (separate heap) | Can share memory (`SharedArrayBuffer`) |
| Overhead | High (OS process creation) | Low (thread creation) |
| Crash safety | Worker crash does not affect master | Thread crash can kill entire process |
| Best for | HTTP server scaling across cores | CPU-heavy JS computation |
| Communication | IPC (serialized JSON) | Faster (SharedArrayBuffer) |

**Use Cluster when**: scaling an HTTP server across CPUs.
**Use Worker Threads when**: doing CPU-intensive JS work (image processing, encryption) where shared memory is an advantage.

---

**Q12. What is `cluster.isPrimary` vs `cluster.isMaster`?**

They are the same thing. `cluster.isMaster` was the original property but was **deprecated in Node.js v16** in favor of `cluster.isPrimary`.

Always use `isPrimary` to show you are up to date.

---

**Q13. How does PM2 use Cluster under the hood?**

PM2 is a process manager that abstracts the cluster module. When you run:

```bash
pm2 start app.js -i max   # -i max = one instance per CPU core
```

PM2 internally:
1. Detects number of CPU cores via `os.cpus().length`
2. Calls `cluster.fork()` for each core
3. Sets up auto-restart on crash
4. Handles rolling restarts on `pm2 reload`
5. Aggregates logs from all workers

```bash
pm2 start app.js -i 4      # 4 workers
pm2 start app.js -i max    # workers = CPU count
pm2 reload app.js           # zero-downtime rolling restart
pm2 logs                    # aggregated logs from all workers
```

PM2 manages the cluster lifecycle for you so you do not write the master/worker boilerplate yourself. Under the hood it is the same `cluster.fork()` -> `child_process.fork()` -> IPC channel chain.

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
Round Robin                  -> default load balancing (non-Windows)
pm2 reload                   -> zero-downtime rolling restart via cluster
```
