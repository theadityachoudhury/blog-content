---
title: "JavaScript Deep Dive: A Comprehensive Guide"
date: 2026-04-02
description: "A thorough walkthrough of JavaScript's core concepts — from how the runtime works under the hood, to modern functional and object-oriented patterns."
tags: [Node.js, Javascript, V8 Engine, DOM Manipulation]
draft: false
---
# JavaScript Deep Dive: A Comprehensive Guide

> A thorough walkthrough of JavaScript's core concepts — from how the runtime works under the hood, to modern functional and object-oriented patterns.

---

## Table of Contents

 1. The Event Loop
 2. Async JavaScript: Callbacks, Promises, Async/Await
 3. Scopes
 4. Data Types
 5. Garbage Collection
 6. DOM Manipulation
 7. Events: Debouncing, Throttling, Bubbling, Delegation
 8. Functions
 9. Object Cloning: Deep and Shallow Copy
10. Object-Oriented Programming (OOP)
11. Functional Programming
12. OOP vs Functional Programming
13. ES6+ Features

---

## 1. The Event Loop

JavaScript is **single-threaded** — it can only do one thing at a time. Yet it handles network requests, timers, and user interactions without freezing. The magic behind this is the **Event Loop**.

### The Components

- **Call Stack**: Where your code runs. When a function is called, a frame is pushed; when it returns, it's popped.
- **Web APIs**: Browser-provided APIs (like `setTimeout`, `fetch`, `DOM events`) that run outside the JS engine.
- **Task Queue (Macrotask Queue)**: Holds callbacks from Web APIs ready to be executed (e.g., `setTimeout` callbacks).
- **Microtask Queue**: Holds promise callbacks (`.then`, `.catch`) and `queueMicrotask` — processed **before** the task queue on every loop tick.
- **Event Loop**: Continuously checks: "Is the call stack empty? If yes, push the next task onto it."

### Execution Order

```
Call Stack → Microtask Queue → Rendering → Macrotask Queue
```

Microtasks always drain completely before the next macrotask runs.

### Example

```javascript
console.log('1 - Start');

setTimeout(() => {
  console.log('4 - setTimeout callback'); // Macrotask
}, 0);

Promise.resolve().then(() => {
  console.log('3 - Promise .then'); // Microtask
});

console.log('2 - End');

// Output:
// 1 - Start
// 2 - End
// 3 - Promise .then
// 4 - setTimeout callback
```

**What happened?**

- `console.log('1')` and `console.log('2')` run synchronously.
- The `setTimeout` callback is scheduled as a **macrotask**.
- The Promise `.then` is scheduled as a **microtask**.
- After the synchronous code finishes, the event loop drains the **microtask queue first**, then picks up the macrotask.

### Visualising the Loop

```javascript
console.log('script start');

setTimeout(() => console.log('setTimeout'), 0);

Promise.resolve()
  .then(() => console.log('promise 1'))
  .then(() => console.log('promise 2'));

console.log('script end');

// script start
// script end
// promise 1
// promise 2
// setTimeout
```

Both `.then` chains (promise 1 and promise 2) run before `setTimeout` because each `.then` schedules a new microtask — and the microtask queue is drained fully before any macrotask runs.

---

## 2. Async JavaScript

### 2.1 Callbacks

A **callback** is a function passed as an argument to another function, to be invoked later.

```javascript
function fetchData(url, onSuccess, onError) {
  // Simulating an async operation
  setTimeout(() => {
    if (url) {
      onSuccess({ data: 'some data' });
    } else {
      onError(new Error('No URL provided'));
    }
  }, 1000);
}

fetchData(
  'https://api.example.com',
  (result) => console.log('Success:', result),
  (err) => console.error('Error:', err)
);
```

**The Problem — Callback Hell:**

When async operations depend on each other, callbacks nest deeply:

```javascript
getUser(userId, (user) => {
  getPosts(user.id, (posts) => {
    getComments(posts[0].id, (comments) => {
      getLikes(comments[0].id, (likes) => {
        // deeply nested, hard to read and maintain
        console.log(likes);
      });
    });
  });
});
```

This is called "callback hell" or the "pyramid of doom." It's hard to read, hard to handle errors, and difficult to reason about.

---

### 2.2 Promises

A **Promise** represents a value that may be available now, in the future, or never. It has three states:

- **Pending**: Initial state.
- **Fulfilled**: Operation succeeded.
- **Rejected**: Operation failed.

```javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = true;
    if (success) {
      resolve({ data: 'user data' });
    } else {
      reject(new Error('Something went wrong'));
    }
  }, 1000);
});

promise
  .then((result) => {
    console.log('Got result:', result);
    return result.data.toUpperCase(); // return value becomes next .then's input
  })
  .then((uppercased) => {
    console.log('Uppercased:', uppercased);
  })
  .catch((err) => {
    console.error('Caught error:', err.message);
  })
  .finally(() => {
    console.log('Cleanup — always runs');
  });
```

**Promise Chaining** solves callback hell:

```javascript
getUser(userId)
  .then((user) => getPosts(user.id))
  .then((posts) => getComments(posts[0].id))
  .then((comments) => getLikes(comments[0].id))
  .then((likes) => console.log(likes))
  .catch((err) => console.error(err));
```

**Promise Combinators:**

```javascript
// Run all in parallel, wait for all to resolve
Promise.all([fetch('/api/users'), fetch('/api/posts'), fetch('/api/comments')])
  .then(([users, posts, comments]) => {
    console.log(users, posts, comments);
  })
  .catch((err) => console.error('One of them failed:', err));

// Resolves/rejects with the first one to settle
Promise.race([fetchWithTimeout('/api/data', 3000), slowBackup()])
  .then((result) => console.log('First result:', result));

// Waits for all, never rejects, returns status+value for each
Promise.allSettled([fetchA(), fetchB(), fetchC()])
  .then((results) => {
    results.forEach((r) => {
      if (r.status === 'fulfilled') console.log(r.value);
      else console.error(r.reason);
    });
  });

// Resolves with the first fulfilled promise
Promise.any([fetchPrimary(), fetchMirror1(), fetchMirror2()])
  .then((fastest) => console.log('First success:', fastest));
```

---

### 2.3 Async / Await

`async/await` is syntactic sugar over Promises that makes async code read like synchronous code.

```javascript
async function loadUserDashboard(userId) {
  try {
    const user = await getUser(userId);        // waits here
    const posts = await getPosts(user.id);     // waits here
    const comments = await getComments(posts[0].id);
    return { user, posts, comments };
  } catch (err) {
    console.error('Dashboard load failed:', err.message);
    throw err; // re-throw so the caller can handle it too
  }
}

// Using it
loadUserDashboard(42)
  .then((dashboard) => renderDashboard(dashboard))
  .catch((err) => showErrorPage(err));
```

**Parallel execution with async/await:**

```javascript
// BAD: sequential — waits for each before starting next
async function sequential() {
  const user = await getUser(1);     // 300ms
  const posts = await getPosts(1);   // 300ms
  // total: ~600ms
}

// GOOD: parallel — start both, then await both
async function parallel() {
  const [user, posts] = await Promise.all([getUser(1), getPosts(1)]);
  // total: ~300ms
}
```

**Top-level await** (ES2022, in modules):

```javascript
// In a .mjs file or <script type="module">
const config = await fetch('/config.json').then((r) => r.json());
console.log(config.apiUrl);
```

---

## 3. Scopes

**Scope** determines where variables are accessible in your code.

### 3.1 Global Scope

Variables declared outside any function or block exist in global scope and are accessible everywhere.

```javascript
var globalVar = 'I am global';
let globalLet = 'Also global';

function foo() {
  console.log(globalVar); // accessible
  console.log(globalLet); // accessible
}

foo();
console.log(globalVar); // accessible
```

In browsers, `var` at the top level becomes a property of `window`. `let` and `const` do not.

```javascript
var x = 10;
console.log(window.x); // 10

let y = 20;
console.log(window.y); // undefined
```

---

### 3.2 Local / Function Scope

Variables declared inside a function are local to that function.

```javascript
function greet() {
  const message = 'Hello!'; // local to greet
  console.log(message);     // works
}

greet();
console.log(message); // ReferenceError: message is not defined
```

Each function call creates its own scope. Variables from one call don't bleed into another.

```javascript
function counter() {
  let count = 0;
  count++;
  console.log(count);
}

counter(); // 1
counter(); // 1 (fresh count each call)
```

---

### 3.3 Block Scope

`let` and `const` (introduced in ES6) are scoped to the nearest `{}` block.

```javascript
{
  let blockVar = 'I exist only in this block';
  const blockConst = 42;
  var notBlock = 'I escape the block'; // var ignores blocks!
}

console.log(notBlock);   // works (var is function-scoped)
console.log(blockVar);   // ReferenceError
console.log(blockConst); // ReferenceError
```

Block scope with loops:

```javascript
// Classic bug with var
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3 — all closures share the same 'i'

// Fixed with let
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2 — each iteration has its own 'i'
```

---

### 3.4 Lexical Scope

Lexical scope means a function's scope is determined by **where it is written** in the source code, not where it is called.

```javascript
const outerValue = 'outer';

function outer() {
  const middleValue = 'middle';

  function inner() {
    const innerValue = 'inner';
    // Can access all of: outerValue, middleValue, innerValue
    console.log(outerValue, middleValue, innerValue);
  }

  inner();
  // Cannot access: innerValue
}

outer();
// Cannot access: middleValue, innerValue
```

The **scope chain**: When a variable isn't found in the current scope, JavaScript walks up the chain to the enclosing scope, then its enclosing scope, and so on, until it hits the global scope or throws a ReferenceError.

```javascript
const a = 1;

function level1() {
  const b = 2;

  function level2() {
    const c = 3;

    function level3() {
      // Scope chain lookup: level3 → level2 → level1 → global
      console.log(a + b + c); // 6
    }

    level3();
  }

  level2();
}

level1();
```

---

### 3.5 Dynamic Scope (and `this`)

JavaScript does not have traditional dynamic scoping for variables — it uses **lexical scope**. However, `this` behaves in a dynamically scoped way: its value depends on **how a function is called**, not where it's defined.

```javascript
const obj = {
  name: 'Alice',
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
};

obj.greet();           // "Hello, I'm Alice" — called on obj, this = obj
const fn = obj.greet;
fn();                  // "Hello, I'm undefined" — called standalone, this = global/undefined
```

This is why understanding `call`, `apply`, and `bind` is important — they explicitly set `this`.

---

## 4. Data Types

JavaScript has **8 data types**: 7 primitives and 1 object type.

### Primitives

Primitives are immutable and compared by **value**.

TypeExampleDescription`number42`, `3.14`, `NaN`, `Infinity`64-bit floating point`bigint9007199254740991n`Arbitrary precision integers`string'hello'`, `` `world` ``Immutable sequence of characters`booleantrue`, `false`Logical values`undefinedundefined`Declared but not assigned`nullnull`Intentional absence of value`symbolSymbol('id')`Unique, non-enumerable identifier

```javascript
// Primitives are copied by value
let a = 5;
let b = a;
b = 10;
console.log(a); // 5 — unchanged

// Type checking
typeof 42;          // 'number'
typeof 'hello';     // 'string'
typeof true;        // 'boolean'
typeof undefined;   // 'undefined'
typeof null;        // 'object' ← famous historical bug
typeof Symbol();    // 'symbol'
typeof 42n;         // 'bigint'
typeof {};          // 'object'
typeof [];          // 'object' (arrays are objects)
typeof function(){}; // 'function'
```

### Objects

Objects are **reference types** — variables hold a reference (pointer) to the data.

```javascript
// Objects are copied by reference
const obj1 = { name: 'Alice' };
const obj2 = obj1;       // obj2 points to the same object
obj2.name = 'Bob';
console.log(obj1.name); // 'Bob' — same object!

// Equality compares references
const x = { a: 1 };
const y = { a: 1 };
console.log(x === y); // false — different objects in memory

const z = x;
console.log(x === z); // true — same reference
```

### Type Coercion

JavaScript automatically converts types in certain contexts (implicit coercion).

```javascript
// Loose equality (==) does type coercion
console.log(0 == false);   // true
console.log('' == false);  // true
console.log(null == undefined); // true
console.log(1 == '1');     // true

// Strict equality (===) does NOT coerce
console.log(0 === false);  // false
console.log(1 === '1');    // false

// Addition coerces to string when one operand is a string
console.log(1 + '2');      // '12'
console.log('3' - 1);      // 2 (subtraction converts to number)
```

Always use `===` unless you explicitly need coercion.

### Truthy and Falsy

```javascript
// Falsy values (evaluate to false in boolean context):
false, 0, -0, 0n, '', "", ``, null, undefined, NaN

// Everything else is truthy, including:
'0', [], {}, function(){}, -1, Infinity

// Practical example
const name = '';
const displayName = name || 'Anonymous'; // 'Anonymous' (falsy → use fallback)

const count = 0;
const safeCount = count ?? 'N/A'; // 0 (nullish coalescing — only null/undefined trigger fallback)
```

---

## 5. Garbage Collection

JavaScript uses **automatic memory management** — you don't manually allocate or free memory. The engine's garbage collector (GC) does it.

### How It Works — Mark and Sweep

The GC starts from **roots** (global variables, the call stack) and marks every object it can reach by following references. Anything **not reachable** is considered garbage and its memory is freed.

```javascript
let user = { name: 'Alice' }; // object is reachable via 'user'
user = null;                   // reference removed — object is now unreachable → GC will collect it
```

### Reference Counting (older engines)

Each object tracks how many references point to it. When count reaches 0, it's freed. The problem: **circular references**.

```javascript
function createCycle() {
  const a = {};
  const b = {};
  a.ref = b; // a references b
  b.ref = a; // b references a
  // Both have count > 0, but neither is reachable from outside the function
  // Old reference-counting GCs would leak this memory
}
createCycle();
// Modern engines use mark-and-sweep, so cycles are handled correctly
```

### Memory Leaks to Watch For

```javascript
// 1. Unintentional globals
function leak() {
  forgotVar = 'I am now a global'; // no let/const/var → global variable
}

// 2. Forgotten event listeners
const button = document.getElementById('btn');
const handler = () => { /* heavy computation */ };
button.addEventListener('click', handler);
// If button is removed from DOM but handler still references data:
button.removeEventListener('click', handler); // always clean up!

// 3. Closures holding large references
function createLeak() {
  const largeData = new Array(1000000).fill('data');
  return function() {
    return largeData[0]; // largeData stays in memory as long as this closure exists
  };
}

// 4. Detached DOM nodes
let detachedNode;
function storeNode() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  detachedNode = div; // even after removal, reference keeps it alive
  document.body.removeChild(div);
}
```

### WeakRef and WeakMap for GC-friendly References

```javascript
// WeakMap: keys are held weakly — if the key object is GC'd, entry is removed
const cache = new WeakMap();

function processUser(user) {
  if (cache.has(user)) return cache.get(user);
  const result = expensiveComputation(user);
  cache.set(user, result);
  return result;
}
// When 'user' object is GC'd, cache entry is automatically cleaned up
```

---

## 6. DOM Manipulation

The **Document Object Model (DOM)** is a tree-like representation of the HTML document. JavaScript can read and modify it dynamically.

### Selecting Elements

```javascript
// Single element selectors
const byId = document.getElementById('myId');
const firstMatch = document.querySelector('.my-class');       // CSS selector
const firstDiv = document.querySelector('div.container > p'); // complex selectors work too

// Multiple element selectors
const allDivs = document.querySelectorAll('div');              // NodeList (iterable)
const byClass = document.getElementsByClassName('btn');        // HTMLCollection (live)
const byTag = document.getElementsByTagName('li');             // HTMLCollection (live)
```

**Live vs Static collections:**

- `getElementsByClassName` / `getElementsByTagName` return **live** collections — they update automatically if the DOM changes.
- `querySelectorAll` returns a **static** NodeList — a snapshot at the time of the call.

```javascript
const liveItems = document.getElementsByTagName('li'); // live
const staticItems = document.querySelectorAll('li');   // static

document.body.appendChild(document.createElement('li'));

console.log(liveItems.length);   // auto-incremented
console.log(staticItems.length); // unchanged
```

### Reading and Modifying Elements

```javascript
const el = document.querySelector('#title');

// Content
el.textContent = 'New Title';    // sets text, escapes HTML
el.innerHTML = '<strong>Bold</strong>'; // parses HTML (be careful with user input!)

// Attributes
el.setAttribute('class', 'active');
el.getAttribute('data-id');
el.removeAttribute('disabled');
el.dataset.userId = '42'; // reads/writes data-* attributes

// Styles
el.style.color = 'red';
el.style.fontSize = '16px';
el.classList.add('active');
el.classList.remove('hidden');
el.classList.toggle('open');
el.classList.contains('active'); // true/false
```

### Creating and Inserting Elements

```javascript
// Create
const newDiv = document.createElement('div');
newDiv.textContent = 'Hello World';
newDiv.className = 'card';

// Insert
document.body.appendChild(newDiv);           // add as last child
document.body.prepend(newDiv);               // add as first child
document.body.insertBefore(newDiv, refNode); // before a reference node
el.insertAdjacentElement('afterend', newDiv); // relative positioning

// Modern methods
el.before(newDiv);  // insert before el
el.after(newDiv);   // insert after el
el.prepend(newDiv); // first child
el.append(newDiv);  // last child

// Remove
el.remove();
el.parentNode.removeChild(el);
```

### DocumentFragment for Performance

Inserting many nodes one by one causes multiple reflows. Use `DocumentFragment` to batch them.

```javascript
const fragment = document.createDocumentFragment();

['Alice', 'Bob', 'Carol'].forEach((name) => {
  const li = document.createElement('li');
  li.textContent = name;
  fragment.appendChild(li); // no DOM reflow here
});

document.getElementById('list').appendChild(fragment); // single reflow
```

---

## 7. Events

### 7.1 Event Bubbling and Capturing

When an event fires on an element, it propagates in **three phases**:

1. **Capture phase**: From the window down to the target.
2. **Target phase**: The event fires on the target element.
3. **Bubble phase**: From the target back up to the window.

```html
<div id="outer">
  <div id="inner">
    <button id="btn">Click me</button>
  </div>
</div>
```

```javascript
document.getElementById('outer').addEventListener('click', () => {
  console.log('outer - bubbling');
});

document.getElementById('inner').addEventListener('click', () => {
  console.log('inner - bubbling');
});

document.getElementById('btn').addEventListener('click', () => {
  console.log('btn - target');
});

// Clicking the button prints:
// btn - target
// inner - bubbling
// outer - bubbling
```

**Capture phase** (add `true` as third argument):

```javascript
document.getElementById('outer').addEventListener('click', () => {
  console.log('outer - capturing');
}, true); // capture phase

// Now clicking btn prints:
// outer - capturing (capture first)
// btn - target
// inner - bubbling
// outer - bubbling
```

**Stopping propagation:**

```javascript
document.getElementById('btn').addEventListener('click', (event) => {
  event.stopPropagation(); // prevents bubble/capture to parent elements
  console.log('btn clicked, no bubbling');
});
```

---

### 7.2 Event Delegation

Instead of attaching listeners to every child, attach **one listener to the parent** and use `event.target` to determine which child was clicked.

```javascript
// Without delegation — bad for large lists or dynamic content
document.querySelectorAll('li').forEach((li) => {
  li.addEventListener('click', handleClick); // one listener per item!
});

// With delegation — one listener for all current and future items
document.getElementById('list').addEventListener('click', (event) => {
  const li = event.target.closest('li'); // works even with nested elements
  if (!li) return;
  console.log('Clicked:', li.textContent);
});
```

**Why delegation is better:**

- Fewer event listeners → better memory usage.
- Works automatically for dynamically added elements.
- Easier to manage.

---

### 7.3 Debouncing

Debouncing ensures a function runs only **after a pause** in activity. Perfect for search inputs or resize handlers.

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);                          // cancel previous timer
    timeoutId = setTimeout(() => fn.apply(this, args), delay); // reset timer
  };
}

const searchInput = document.getElementById('search');

const handleSearch = debounce((event) => {
  console.log('Searching for:', event.target.value);
  // API call here
}, 300);

searchInput.addEventListener('input', handleSearch);
// Only fires 300ms after the user stops typing
```

**When to use:** Search-as-you-type, auto-save, window resize recalculation.

---

### 7.4 Throttling

Throttling ensures a function runs at most **once per interval**, regardless of how many times it's triggered.

```javascript
function throttle(fn, limit) {
  let lastRun = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastRun >= limit) {
      lastRun = now;
      return fn.apply(this, args);
    }
  };
}

const handleScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100); // at most once every 100ms

window.addEventListener('scroll', handleScroll);
```

**When to use:** Scroll handlers, mouse move tracking, real-time game updates.

**Debounce vs Throttle:**

DebounceThrottleFiresAfter activity stopsAt regular intervalsUse caseSearch input, auto-saveScroll, mouse move, resizeGuarantees firingOnly after silenceAt least once per interval

---

## 8. Functions

### 8.1 Function Declarations vs Expressions

**Function Declaration:**

```javascript
// Can be called before it's defined (hoisted)
greet(); // works!

function greet() {
  return 'Hello!';
}
```

**Function Expression:**

```javascript
// Cannot be called before it's assigned
greet(); // TypeError: greet is not a function

const greet = function() {
  return 'Hello!';
};

// Named function expression (name useful for recursion and stack traces)
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
};
```

---

### 8.2 Hoisting

**Hoisting** is JavaScript's behavior of moving declarations to the top of their scope during the compilation phase — before execution.

```javascript
// What you write:
console.log(x); // undefined
var x = 5;
console.log(x); // 5

// What the engine sees:
var x;          // declaration hoisted, initialized as undefined
console.log(x); // undefined
x = 5;          // assignment stays in place
console.log(x); // 5
```

`let` and `const` are also hoisted, but into the **Temporal Dead Zone (TDZ)** — accessing them before declaration throws a ReferenceError.

```javascript
console.log(a); // undefined (var is hoisted + initialized)
console.log(b); // ReferenceError: Cannot access 'b' before initialization (TDZ)
console.log(c); // ReferenceError: Cannot access 'c' before initialization (TDZ)

var a = 1;
let b = 2;
const c = 3;
```

**Function declarations are fully hoisted** (both the name and the body):

```javascript
sayHello(); // works: "Hello!"

function sayHello() {
  console.log('Hello!');
}
```

---

### 8.3 Arrow Functions

Arrow functions are a concise syntax introduced in ES6 with important differences from regular functions.

```javascript
// Regular function
const double = function(x) { return x * 2; };

// Arrow function
const double = (x) => x * 2;          // implicit return
const double = x => x * 2;            // single param: parentheses optional
const greet = () => 'Hello!';          // no params
const getUser = () => ({ id: 1 });    // returning object: wrap in ()
const add = (a, b) => {               // multiline: explicit return needed
  const result = a + b;
  return result;
};
```

**Key differences from regular functions:**

1. **No own** `this` — they inherit `this` from the enclosing lexical scope.

```javascript
const timer = {
  seconds: 0,
  start() {
    // Regular function would lose 'this' context
    setInterval(function() {
      this.seconds++; // 'this' is window/undefined here!
    }, 1000);

    // Arrow function inherits 'this' from start()
    setInterval(() => {
      this.seconds++; // 'this' is the timer object ✓
    }, 1000);
  }
};
```

2. **No** `arguments` **object** — use rest parameters instead.

```javascript
const regular = function() {
  console.log(arguments); // works
};

const arrow = (...args) => {
  console.log(args); // use rest params
};
```

3. **Cannot be used as constructors** — no `new` keyword.

```javascript
const Person = (name) => { this.name = name; };
new Person('Alice'); // TypeError: Person is not a constructor
```

4. **No** `prototype` **property**.

---

### 8.4 Closures

A **closure** is a function that remembers and accesses variables from its outer scope even after that scope has finished executing.

```javascript
function makeCounter() {
  let count = 0; // This variable is "closed over"

  return {
    increment() { count++; },
    decrement() { count--; },
    getCount() { return count; }
  };
}

const counter = makeCounter();
counter.increment();
counter.increment();
counter.increment();
counter.decrement();
console.log(counter.getCount()); // 2

// 'count' is not accessible from outside
console.log(counter.count); // undefined
```

**Closures for data encapsulation (private state):**

```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance; // private

  return {
    deposit(amount) {
      if (amount > 0) balance += amount;
    },
    withdraw(amount) {
      if (amount > 0 && amount <= balance) {
        balance -= amount;
        return true;
      }
      return false;
    },
    getBalance() {
      return balance;
    }
  };
}

const account = createBankAccount(100);
account.deposit(50);
account.withdraw(30);
console.log(account.getBalance()); // 120
// No way to directly set balance — it's protected by the closure
```

**Closures in loops (the classic mistake):**

```javascript
// Bug: all share the same 'i'
const funcs = [];
for (var i = 0; i < 5; i++) {
  funcs.push(() => console.log(i));
}
funcs[0](); // 5 (not 0!)

// Fix 1: Use let (creates a new binding per iteration)
for (let i = 0; i < 5; i++) {
  funcs.push(() => console.log(i));
}
funcs[0](); // 0 ✓

// Fix 2: IIFE to capture the value
for (var i = 0; i < 5; i++) {
  funcs.push(((n) => () => console.log(n))(i));
}
funcs[0](); // 0 ✓
```

**Memoization using closures:**

```javascript
function memoize(fn) {
  const cache = new Map(); // closed over

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize((n) => {
  console.log('Computing...');
  return n * n;
});

expensiveCalc(5); // Computing... 25
expensiveCalc(5); //              25 (cached!)
```

---

## 9. Object Cloning

### 9.1 Shallow Copy

A shallow copy creates a new object, but **nested objects are still shared by reference**.

```javascript
const original = {
  name: 'Alice',
  address: { city: 'NYC', zip: '10001' },
  hobbies: ['reading', 'coding']
};

// Method 1: Spread operator
const shallow1 = { ...original };

// Method 2: Object.assign
const shallow2 = Object.assign({}, original);

// Modifying top-level property — safe
shallow1.name = 'Bob';
console.log(original.name); // 'Alice' — unaffected

// Modifying nested object — DANGER
shallow1.address.city = 'LA';
console.log(original.address.city); // 'LA' — original was mutated!
```

The nested `address` object is the **same reference** in both `original` and `shallow1`.

---

### 9.2 Deep Copy

A deep copy creates completely independent copies at all levels.

```javascript
const original = {
  name: 'Alice',
  address: { city: 'NYC' },
  hobbies: ['reading', 'coding']
};

// Method 1: structuredClone (modern, recommended — ES2022)
const deep1 = structuredClone(original);
deep1.address.city = 'LA';
console.log(original.address.city); // 'NYC' — safe!

// Method 2: JSON.parse/JSON.stringify (quick but has limitations)
const deep2 = JSON.parse(JSON.stringify(original));
// LIMITATIONS: loses undefined, functions, Date objects, symbols, circular refs

// Method 3: Recursive deep clone (for full control)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);
  if (Array.isArray(value)) return value.map(deepClone);

  const cloned = {};
  for (const key of Object.keys(value)) {
    cloned[key] = deepClone(value[key]);
  }
  return cloned;
}
```

**When to use which:**

- **Shallow copy**: When you know the object has no nested mutable state, or you want intentional sharing of nested references.
- **Deep copy**: When you need complete independence between original and copy (e.g., state management, undo/redo).

---

## 10. Object-Oriented Programming

### 10.1 Classical vs Prototypical Inheritance

**Classical Inheritance** (like Java/C++) copies methods into subclasses — creating independent copies.

**JavaScript uses Prototypal Inheritance** — objects delegate to other objects through the **prototype chain**. When you access a property that doesn't exist on an object, JS looks up the chain.

```javascript
const animal = {
  breathe() { return 'breathing'; }
};

const dog = Object.create(animal); // dog's prototype IS animal
dog.bark = function() { return 'woof'; };

console.log(dog.breathe()); // found on prototype: 'breathing'
console.log(dog.bark());    // found on dog itself: 'woof'

// Check the chain
console.log(Object.getPrototypeOf(dog) === animal); // true
console.log(dog.hasOwnProperty('bark'));            // true
console.log(dog.hasOwnProperty('breathe'));         // false
```

**ES6 Classes** (syntactic sugar over prototypal inheritance):

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound.`;
  }

  toString() {
    return `Animal(${this.name})`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);        // calls parent constructor
    this.breed = breed;
  }

  speak() {
    return `${this.name} barks.`; // method override
  }

  fetch(item) {
    return `${this.name} fetches the ${item}!`;
  }
}

const rex = new Dog('Rex', 'Labrador');
console.log(rex.speak());          // 'Rex barks.'
console.log(rex.fetch('ball'));    // 'Rex fetches the ball!'
console.log(rex instanceof Dog);   // true
console.log(rex instanceof Animal);// true
```

**Under the hood**, the class syntax creates the same prototype chain:

```javascript
// What ES6 class compiles to (roughly):
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound.`;
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.speak = function() {
  return `${this.name} barks.`;
};
```

---

### 10.2 `this` Context

`this` refers to the execution context — it depends on **how the function is called**.

```javascript
// 1. Global context (non-strict): this = window
console.log(this); // Window

// 2. Object method: this = the object
const user = {
  name: 'Alice',
  greet() {
    console.log(this.name); // 'Alice'
  }
};
user.greet();

// 3. Standalone function call (non-strict): this = window
function show() {
  console.log(this); // Window (or undefined in strict mode)
}
show();

// 4. Constructor: this = new instance
function Person(name) {
  this.name = name;
}
const alice = new Person('Alice');
console.log(alice.name); // 'Alice'

// 5. Arrow function: this = enclosing scope's this
const obj = {
  value: 42,
  getValue: function() {
    const inner = () => this.value; // inherits this from getValue
    return inner();
  }
};
console.log(obj.getValue()); // 42

// 6. Event handlers: this = the element that fired the event
button.addEventListener('click', function() {
  console.log(this); // the button element
});
button.addEventListener('click', () => {
  console.log(this); // the outer this — NOT the button!
});
```

---

### 10.3 `call`, `apply`, and `bind`

These methods explicitly set `this`.

`call` — invokes immediately, arguments passed individually:

```javascript
function introduce(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

const alice = { name: 'Alice' };
const bob = { name: 'Bob' };

console.log(introduce.call(alice, 'Hi', '!'));  // "Hi, I'm Alice!"
console.log(introduce.call(bob, 'Hey', '.'));   // "Hey, I'm Bob."
```

`apply` — invokes immediately, arguments passed as array:

```javascript
console.log(introduce.apply(alice, ['Hi', '!'])); // "Hi, I'm Alice!"

// Practical: spread an array of args to a function
const numbers = [5, 2, 9, 1, 7];
const max = Math.max.apply(null, numbers); // same as Math.max(...numbers)
```

`bind` — returns a new function with `this` permanently bound:

```javascript
const aliceIntro = introduce.bind(alice, 'Hello'); // partially applied too
console.log(aliceIntro('!')); // "Hello, I'm Alice!"
console.log(aliceIntro('?')); // "Hello, I'm Alice?"

// Common use: fixing 'this' in event handlers
class Button {
  constructor(label) {
    this.label = label;
    this.click = this.click.bind(this); // bind once in constructor
  }
  click() {
    console.log(`${this.label} was clicked`);
  }
}
const btn = new Button('Submit');
document.getElementById('btn').addEventListener('click', btn.click);
```

MethodInvokes immediately?Args formatReturns`call`YesSpread: `(a, b, c)`Result`apply`YesArray: `([a, b, c])`Result`bind`NoSpread: `(a, b, c)`New function

---

## 11. Functional Programming

### 11.1 Pure Functions

A **pure function** always returns the same output for the same input and has **no side effects**.

```javascript
// IMPURE — depends on external state, has side effects
let total = 0;
function addToTotal(amount) {
  total += amount; // side effect: modifies external variable
  return total;    // output depends on external state
}

// PURE — same input, same output, no side effects
function add(a, b) {
  return a + b;
}

// IMPURE
function getRandomGreeting(name) {
  const random = Math.random() > 0.5 ? 'Hi' : 'Hello';
  return `${random}, ${name}!`; // non-deterministic
}

// PURE (deterministic)
function greet(greeting, name) {
  return `${greeting}, ${name}!`;
}

// IMPURE
function saveUser(user) {
  fetch('/api/users', { method: 'POST', body: JSON.stringify(user) }); // side effect
}

// Benefits of pure functions:
// - Predictable and testable
// - Safe to memoize/cache
// - Safe to run in parallel
// - Easier to reason about
```

---

### 11.2 Higher-Order Functions

A **higher-order function** is a function that takes a function as an argument or returns a function.

```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// map: transform each element, returns new array
const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

// filter: keep elements matching predicate
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4, 6, 8, 10]

// reduce: fold array into a single value
const sum = numbers.reduce((acc, n) => acc + n, 0);
// 55

// Chaining them:
const sumOfSquaredEvens = numbers
  .filter(n => n % 2 === 0)    // [2, 4, 6, 8, 10]
  .map(n => n * n)             // [4, 16, 36, 64, 100]
  .reduce((acc, n) => acc + n, 0); // 220

// Creating higher-order functions
function multiplier(factor) {
  return (n) => n * factor; // returns a function
}

const triple = multiplier(3);
const tenTimes = multiplier(10);

console.log(triple(5));    // 15
console.log(tenTimes(5));  // 50

[1, 2, 3].map(triple); // [3, 6, 9]
```

---

### 11.3 Function Composition

**Function composition** is combining simple functions to build more complex behaviour. The output of one function feeds as input to the next.

```javascript
// Manual composition
const add1 = x => x + 1;
const double = x => x * 2;
const square = x => x * x;

// Composed: apply add1, then double, then square
const transform = x => square(double(add1(x)));
console.log(transform(3)); // square(double(4)) = square(8) = 64

// compose: applies right-to-left (mathematical convention)
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

// pipe: applies left-to-right (more readable)
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

const processNumber = pipe(
  add1,   // 3 + 1 = 4
  double, // 4 * 2 = 8
  square  // 8 * 8 = 64
);

console.log(processNumber(3)); // 64

// Real-world example: data pipeline
const users = [
  { name: 'alice', age: 17, active: true },
  { name: 'bob', age: 25, active: false },
  { name: 'carol', age: 30, active: true },
];

const formatName = user => ({ ...user, name: user.name[0].toUpperCase() + user.name.slice(1) });
const filterAdults = users => users.filter(u => u.age >= 18);
const filterActive = users => users.filter(u => u.active);

const processUsers = pipe(filterAdults, filterActive, users => users.map(formatName));
console.log(processUsers(users));
// [{ name: 'Carol', age: 30, active: true }]
```

---

### 11.4 Currying

**Currying** transforms a function with multiple arguments into a chain of functions that each take one argument.

```javascript
// Regular function
function add(a, b, c) {
  return a + b + c;
}
add(1, 2, 3); // 6

// Curried version
function curriedAdd(a) {
  return function(b) {
    return function(c) {
      return a + b + c;
    };
  };
}
// or with arrow syntax:
const curriedAdd = a => b => c => a + b + c;

curriedAdd(1)(2)(3); // 6
const add1 = curriedAdd(1);     // partially applied — waiting for b and c
const add1and2 = add1(2);       // partially applied — waiting for c
console.log(add1and2(3));       // 6

// Generic curry utility
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  };
}

const curriedMultiply = curry((a, b, c) => a * b * c);
curriedMultiply(2)(3)(4); // 24
curriedMultiply(2, 3)(4); // 24
curriedMultiply(2)(3, 4); // 24
curriedMultiply(2, 3, 4); // 24

// Real-world use: event handling
const on = curry((event, element, handler) => {
  element.addEventListener(event, handler);
});

const onClick = on('click');
const onClickBtn = onClick(document.getElementById('btn'));
onClickBtn(() => console.log('clicked!'));
```

**Why curry?**

- Enables partial application — pre-fill some arguments.
- Creates more reusable, composable functions.
- Reduces repetition when calling the same function with a fixed argument.

---

### 11.5 Immutability and Side Effects

In FP, **immutability** means never modifying existing data — always create new structures.

```javascript
// MUTABLE (bad in FP)
const user = { name: 'Alice', score: 100 };
user.score += 10; // mutating original

// IMMUTABLE (good in FP)
const updatedUser = { ...user, score: user.score + 10 }; // new object
// user is unchanged, updatedUser is new

// Arrays
const items = [1, 2, 3];

// Mutable operations to avoid:
items.push(4);      // mutates
items.pop();        // mutates
items.splice(1, 1); // mutates
items.sort();       // mutates!
items.reverse();    // mutates!

// Immutable alternatives:
const withFour = [...items, 4];             // add
const withoutLast = items.slice(0, -1);     // remove last
const withoutSecond = items.filter((_, i) => i !== 1); // remove by index
const sorted = [...items].sort();           // sort without mutation
const reversed = [...items].reverse();      // reverse without mutation
```

**Side effects** are anything a function does beyond computing and returning a value: modifying a variable outside its scope, writing to a file, making a network request, changing the DOM.

Pure FP aims to **isolate side effects** at the edges of the system, keeping the core logic pure and testable.

```javascript
// Side-effect-free core logic
function calculateOrderTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}

// Side effects pushed to the edges
async function processOrder(orderId) {
  const order = await fetchOrder(orderId);         // side effect: network
  const total = calculateOrderTotal(order.items, 0.1); // pure!
  await saveOrderTotal(orderId, total);             // side effect: DB write
  renderTotal(total);                              // side effect: DOM
}
```

---

## 12. OOP vs Functional Programming

### Core Philosophies

OOPFunctional ProgrammingCore unitObject (state + behaviour)Function (transformation)StateEncapsulated, mutableImmutable, passed throughFocus"What things are""What things do"Code reuseInheritance, compositionFunction compositionSide effectsCommon, managed via encapsulationMinimized, isolated

### OOP Example

```javascript
class ShoppingCart {
  #items = [];

  addItem(item) {
    this.#items = [...this.#items, item];
  }

  removeItem(id) {
    this.#items = this.#items.filter(item => item.id !== id);
  }

  getTotal() {
    return this.#items.reduce((sum, item) => sum + item.price, 0);
  }

  getItems() {
    return [...this.#items];
  }
}

const cart = new ShoppingCart();
cart.addItem({ id: 1, name: 'Book', price: 15 });
cart.addItem({ id: 2, name: 'Pen', price: 2 });
console.log(cart.getTotal()); // 17
```

### Functional Example

```javascript
// State is just data
const emptyCart = { items: [] };

// Pure functions transform state
const addItem = (cart, item) => ({
  ...cart,
  items: [...cart.items, item]
});

const removeItem = (cart, id) => ({
  ...cart,
  items: cart.items.filter(item => item.id !== id)
});

const getTotal = (cart) =>
  cart.items.reduce((sum, item) => sum + item.price, 0);

// Usage
const cart1 = addItem(emptyCart, { id: 1, name: 'Book', price: 15 });
const cart2 = addItem(cart1, { id: 2, name: 'Pen', price: 2 });
console.log(getTotal(cart2)); // 17
// cart1 and emptyCart are unchanged
```

### When to Use Which

**Prefer OOP when:**

- You're modeling real-world entities with clear state and behaviour (User, Order, Product).
- You need encapsulation and access control.
- Working with frameworks that use classes (React class components, Angular, Java-style APIs).

**Prefer FP when:**

- You're transforming data (ETL pipelines, data processing).
- Correctness and predictability are paramount (financial calculations, state management).
- You want highly testable, composable code.
- Building pure utilities or libraries.

**In practice — use both:**

Modern JavaScript encourages a hybrid approach. React uses functional components (FP) alongside OOP-style class-based patterns. Redux reducers are pure functions; React components can be classes.

```javascript
// Hybrid: class manages lifecycle, methods are pure transformations
class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  // Pure transformation
  static formatUser(rawUser) {
    return {
      id: rawUser.id,
      name: rawUser.name.trim(),
      email: rawUser.email.toLowerCase()
    };
  }

  async getUser(id) {
    const raw = await this.repository.findById(id);
    return UserService.formatUser(raw);
  }
}
```

---

## 13. ES6+ Features

### Destructuring

```javascript
// Object destructuring
const user = { name: 'Alice', age: 30, city: 'NYC' };
const { name, age } = user;
const { name: fullName, role = 'user' } = user; // rename + default value

// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
const [,, third] = [1, 2, 3]; // skip elements

// Nested destructuring
const { address: { city, zip } } = { address: { city: 'NYC', zip: '10001' } };

// Function parameter destructuring
function displayUser({ name, age, role = 'user' }) {
  console.log(`${name} (${age}) — ${role}`);
}
displayUser(user);
```

---

### Spread and Rest

```javascript
// Spread: expand iterable into individual elements
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]

const obj1 = { a: 1 };
const obj2 = { ...obj1, b: 2 }; // { a: 1, b: 2 }

Math.max(...arr1); // equivalent to Math.max(1, 2, 3)

// Rest: collect remaining elements
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4, 5); // 15

const { a, ...remaining } = { a: 1, b: 2, c: 3 };
// remaining = { b: 2, c: 3 }
```

---

### Template Literals

```javascript
const name = 'Alice';
const age = 30;

// Simple interpolation
const greeting = `Hello, ${name}! You are ${age} years old.`;

// Expression evaluation
const result = `${2 + 2} is four`;
const status = `User is ${age >= 18 ? 'adult' : 'minor'}`;

// Multi-line strings
const html = `
  <div class="card">
    <h2>${name}</h2>
    <p>Age: ${age}</p>
  </div>
`;

// Tagged templates
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) =>
    `${result}${str}${values[i] !== undefined ? `<mark>${values[i]}</mark>` : ''}`, ''
  );
}
const tagged = highlight`Name: ${name}, Age: ${age}`;
// "Name: <mark>Alice</mark>, Age: <mark>30</mark>"
```

---

### Default Parameters

```javascript
function createUser(name, role = 'user', active = true) {
  return { name, role, active };
}

createUser('Alice');          // { name: 'Alice', role: 'user', active: true }
createUser('Bob', 'admin');   // { name: 'Bob', role: 'admin', active: true }

// Default can be an expression
function fetchData(url, timeout = Date.now() + 5000) { /* ... */ }

// Default parameters can reference earlier params
function createTag(tag, content, className = `${tag}-default`) {
  return `<${tag} class="${className}">${content}</${tag}>`;
}
```

---

### Modules (ESM)

```javascript
// math.js — named exports
export const PI = 3.14159;
export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }

// utils.js — default export
export default function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// main.js — imports
import formatDate from './utils.js';                // default import
import { add, multiply } from './math.js';          // named imports
import { add as sum } from './math.js';             // rename
import * as MathUtils from './math.js';             // namespace import

// Dynamic import (lazy loading)
async function loadChart() {
  const { Chart } = await import('./chart.js');
  return new Chart();
}
```

---

### Optional Chaining and Nullish Coalescing

```javascript
const user = {
  name: 'Alice',
  address: {
    city: 'NYC'
  }
};

// Without optional chaining:
const city = user && user.address && user.address.city; // verbose

// With optional chaining:
const city = user?.address?.city;        // 'NYC'
const zip = user?.address?.zip;          // undefined (no error)
const len = user?.friends?.length;       // undefined (no error)

// On methods:
const result = user?.getAge?.();         // calls only if method exists

// On arrays:
const first = users?.[0]?.name;         // safe array access

// Nullish coalescing: use default only for null/undefined (not 0 or '')
const displayName = user?.name ?? 'Anonymous';
const count = response?.count ?? 0;
const title = config?.title ?? 'Untitled';

// vs OR operator (which treats 0, '', false as falsy):
const count2 = response?.count || 0;    // if count is 0, this gives 0 too, but it's accidentally correct here
const isActive = user?.active ?? true;  // false stays false (nullish)
const isActive2 = user?.active || true; // false becomes true (wrong!)
```

---

### `let`, `const`, and Block Scope

```javascript
// const: reference is immutable (but object contents can change)
const user = { name: 'Alice' };
user.name = 'Bob';  // OK — we're modifying the object, not the reference
user = {};          // TypeError: Assignment to constant variable

// const with arrays
const arr = [1, 2, 3];
arr.push(4);        // OK
arr = [];           // TypeError

// Use const by default, let when you need to reassign
for (let i = 0; i < 5; i++) { /* i changes, must be let */ }

let x = 1;
if (condition) {
  x = 2; // reassignment — needs let
}
```

---

### Classes (Revisited: Static, Private)

```javascript
class Counter {
  static #instances = 0;     // private static field
  #count;                    // private instance field

  constructor(initial = 0) {
    this.#count = initial;
    Counter.#instances++;
  }

  increment() { this.#count++; return this; } // fluent interface
  decrement() { this.#count--; return this; }
  reset() { this.#count = 0; return this; }

  get value() { return this.#count; } // getter

  static getInstances() { return Counter.#instances; }
}

const c = new Counter(10);
c.increment().increment().decrement();
console.log(c.value);             // 11
console.log(Counter.getInstances()); // 1
```

---

### Symbols

```javascript
// Every Symbol is unique
const id1 = Symbol('id');
const id2 = Symbol('id');
console.log(id1 === id2); // false

// Use as unique object keys (won't collide with other properties)
const ID = Symbol('id');
const user = {
  name: 'Alice',
  [ID]: 123  // symbol-keyed property
};

user[ID]; // 123
// Symbols are not enumerated in for...in or Object.keys
console.log(Object.keys(user)); // ['name'] — no ID

// Well-known symbols for customising JS behaviour
class CustomCollection {
  #items = [1, 2, 3];

  [Symbol.iterator]() {
    let index = 0;
    const items = this.#items;
    return {
      next() {
        return index < items.length
          ? { value: items[index++], done: false }
          : { done: true };
      }
    };
  }
}

const col = new CustomCollection();
for (const item of col) console.log(item); // 1, 2, 3
```

---

### Generators

```javascript
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i; // pauses and returns value
  }
}

for (const n of range(0, 10, 2)) {
  console.log(n); // 0, 2, 4, 6, 8
}

// Infinite sequence (lazy — only computes on demand)
function* naturals() {
  let n = 1;
  while (true) {
    yield n++;
  }
}

const gen = naturals();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
console.log(gen.next().value); // 3
// ...never runs out
```

---

### Map and Set

```javascript
// Map: key-value store where keys can be ANY type
const map = new Map();
map.set('name', 'Alice');
map.set(42, 'the answer');
map.set({ id: 1 }, 'user object as key');

map.get('name');     // 'Alice'
map.has(42);         // true
map.size;            // 3
map.delete('name');

// Iterating
for (const [key, value] of map) {
  console.log(key, value);
}

// Set: collection of unique values
const set = new Set([1, 2, 3, 2, 1]); // {1, 2, 3}
set.add(4);
set.has(2); // true
set.size;   // 4

// Removing duplicates from array
const unique = [...new Set([1, 2, 2, 3, 3, 4])]; // [1, 2, 3, 4]

// Set operations
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);

const union = new Set([...setA, ...setB]);                      // {1,2,3,4,5,6}
const intersection = new Set([...setA].filter(x => setB.has(x))); // {3,4}
const difference = new Set([...setA].filter(x => !setB.has(x))); // {1,2}
```

---

### Proxy and Reflect

```javascript
// Proxy: intercept and customise operations on objects
const handler = {
  get(target, key) {
    console.log(`Getting ${key}`);
    return key in target ? target[key] : `Property '${key}' not found`;
  },
  set(target, key, value) {
    if (typeof value !== 'string') throw new TypeError('Only strings allowed');
    target[key] = value;
    return true;
  }
};

const proxy = new Proxy({ name: 'Alice' }, handler);
console.log(proxy.name);  // Getting name → 'Alice'
console.log(proxy.age);   // Getting age → "Property 'age' not found"
proxy.role = 'admin';     // OK
proxy.score = 100;        // TypeError: Only strings allowed
```

---

*This guide covers the foundational and intermediate concepts that every JavaScript developer should be comfortable with. Mastering these will give you a strong mental model of how the language works under the hood and how to write clean, efficient, maintainable code.*
