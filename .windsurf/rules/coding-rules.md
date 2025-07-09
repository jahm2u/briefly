---
trigger: always_on
---

---
trigger: always_on
---

## ✅ Project Structure (Mandatory)

Follow exactly:

```
/lib
  /core
    /config             # API keys, environment configs
    /utils              # Utility helpers
    /services           # Todoist, iCal, Telegram integrations
    /models             # Task and calendar data models
    /exceptions         # Custom error handling
  /logic
    /grouping           # GPT logic for task grouping
    /messaging          # GPT prompt logic for Telegram messaging
/test
  /unit
  /integration
  /mocks
```

---

## ✅ Technical Standards (Non-negotiable)

* Clean Architecture strictly adhered
* Files must not exceed 150 lines
* Single Responsibility Principle: one class/file

---

## ✅ Integrations

* Telegram: Message sending and receiving (bot API)
* Todoist REST API (tasks retrieval, deeplink generation)
* iCal parsing (calendar events)
* gpt-4.1-mini API integration (OpenAI)

---

## ✅ Messaging & GPT Prompt Strategy

* 3 daily messages: Morning (7am), Afternoon (post-final meeting), Evening (8pm)
* Prompts clearly defined, avoiding task text alterations
* Logical grouping by GPT without changing original task content
* Always provide Todoist task deeplinks appended with "View Task"

---

## ✅ State Management

* Lightweight state management (Provider recommended)
* Stateless and immutable data models preferred

---

## ✅ Testing & TDD Practices

* Tests written first (mandatory TDD)
* Unit tests cover all logic (>90% critical paths)
* Integration tests for Todoist, iCal, GPT, and Telegram
* Mock external APIs

---

## ✅ Security & Privacy

* flutter\_secure\_storage (AES-256 encryption)
* No plaintext API keys or secrets
* Explicit encryption of sensitive stored data
* Zero logging of sensitive user information

---

## ✅ Performance

* Isolates for GPT-related computations
* Minimize network calls, robust offline handling

---

## ✅ Dependency Management

* Explicitly pinned versions (pubspec.yaml)
* Minimal external dependencies
* Regularly review for security and compatibility updates

---
\


### ❌ DON'T

- Do not create or maintain a `/tests/` folder for unit tests.
- Do not separate tests from the code they validate.
- Do not make developers guess where the related test lives.

### Exceptions

- End-to-end tests, smoke tests, or black-box flows can live in a `/tests/` folder at the project root.
- Shared mocks or test utilities can live in `src/tests/` or `src/test-utils/`, depending on context.

---

### 👊 Principle

If you’re writing unit tests for services, utils, or components — put the `*.spec.ts` file **next to the code** it’s testing.

If you’re using a central `/tests/` folder for unit tests, you’re overcomplicating structure, slowing down dev velocity, and diluting code ownership.

**Fix it. Simplify. Localize.**
use context7

