# Development Agent Instructions

## Core Philosophy

This codebase follows a rigorous 4-pillar development methodology. AI agents must strictly adhere to these principles in all interactions.

## Custom Command Files

The following command files provide specialized workflows. Use `@filename.md` to invoke:

- **@fix.md** - Bug fixing with 5-category taxonomy, environment awareness, and dependency management
- **@design.md** - Design-first architecture and system design
- **@implement.md** - Feature implementation following the 4-pillar methodology
- **@research.md** - Comprehensive technical research with evidence gathering
- **@review.md** - Code review following methodology compliance

## CRITICAL DEVELOPMENT RULES (MANDATORY - NO EXCEPTIONS)

**IMPORTANT:** Please never create any new markdown files without explicit request or permission from the user.

### Rule 0: How to Handle Bugs

**Bug Taxonomy - Understanding the Five Categories:**

Reality is more nuanced than binary classification. Use this taxonomy to guide your approach:

**1. SYNTAX/TYPO BUGS**

- **Nature**: Truly localized errors with zero system implications
- **Examples**: Missing semicolon, typo in variable name, incorrect import path
- **Approach**: Fix immediately
- **Requirements**: Add regression test, verify no side effects
- **Risk Level**: ⚫ MINIMAL

**2. LOGIC BUGS (Localized)**

- **Nature**: Contained within single function/module with clear isolation
- **Examples**: Off-by-one error, incorrect conditional, wrong calculation
- **Approach**: Fix with test, verify boundaries
- **Requirements**: Ensure truly isolated, check for similar patterns elsewhere
- **Risk Level**: 🟡 LOW (but verify isolation)

**3. INTEGRATION BUGS**

- **Nature**: Multiple components involved, often misunderstood as localized
- **Examples**: API contract mismatch, state synchronization issues, data transformation errors
- **Approach**: Analyze data flow across boundaries, fix at interface level
- **Requirements**: Design review of interaction patterns, comprehensive integration tests
- **Risk Level**: 🟠 MEDIUM-HIGH (whack-a-mole danger if treated as localized)
- **⚠️ WARNING**: These are commonly misclassified as logic bugs - be careful!

**4. ARCHITECTURAL/BEHAVIORAL BUGS**

- **Nature**: System-wide implications, often stem from design assumptions
- **Examples**: Race conditions, incorrect state machine, wrong architectural pattern
- **Approach**: MUST analyze entire system flow, may require design changes
- **Requirements**: Full system analysis, design approval for fix, extensive testing
- **Risk Level**: 🔴 HIGH (localized fixes will cascade into more bugs)
- **⚠️ CRITICAL**: NEVER fix these locally

**5. REQUIREMENTS BUGS**

- **Nature**: The "correct" behavior itself is wrong or misunderstood
- **Examples**: Feature doesn't match actual user need, business logic is incorrect
- **Approach**: Clarify requirements FIRST, then redesign and implement
- **Requirements**: User/stakeholder validation before any code changes
- **Risk Level**: 🔴 HIGH (fixing without clarification wastes time and creates confusion)

**Classification Decision Tree:**

```
Bug Identified
    │
    ├─ Is it a typo/syntax error?
    │   └─ YES → Category 1: Fix immediately
    │
    ├─ Does it involve multiple components?
    │   └─ YES → Likely Category 3 or 4: Analyze integration points
    │
    ├─ Is the expected behavior unclear or disputed?
    │   └─ YES → Category 5: Clarify requirements first
    │
    ├─ Can you verify the fix affects only one function with zero side effects?
    │   ├─ YES, CERTAIN → Category 2: Fix with tests
    │   └─ UNCERTAIN → Treat as Category 3: Analyze deeper
    │
    └─ Does it involve system-wide state, concurrency, or architecture?
        └─ YES → Category 4: Full system analysis required
```

**CRITICAL WARNING:**

- Fixing integration/architectural bugs by editing small, localized code blocks without proper consideration for the overall codebase often creates new issues
- This "whack-a-mole" approach masks existing problems and makes identifying and fixing the root cause even more difficult
- When in doubt about classification, escalate to a higher category (treat as more complex)

**General Bug-Fixing Principles:**

1. Classify the bug using the taxonomy above
2. For Categories 3-5: Research root cause thoroughly before attempting any fix
3. For Categories 1-2: Verify true isolation before proceeding
4. Always consider impact on the entire codebase, not just the immediate area
5. Consult with user if unclear about system-wide implications
6. Document your classification reasoning in commit message

**For detailed bug-fixing workflows, use: `@fix.md`**

### Rule 0.5: Development Environment Awareness

**MANDATORY - UNDERSTAND ENVIRONMENT BEFORE ANY WORK:**

Before starting ANY task (implementation, debugging, testing), you MUST understand and document the development environment. This understanding must persist across all tasks to prevent repeated trial-and-error.

**Environment Discovery is Mandatory:**

1. **Check for environment documentation first**

   - Review CLAUDE.md, README.md for setup instructions
   - Look for `.devcontainer/`, `docker-compose.yml`, `Dockerfile`
   - Check for `.venv/`, `venv/`, `pyproject.toml`, `uv.lock`, `package.json`

2. **Identify environment type(s)**

   - Containerized (Docker, Dev Containers)
   - Virtual environment (Python venv, UV)
   - Node.js (npm, yarn)
   - Mixed environments (both local and containers)

3. **Document key facts**

   - How to build/run the application
   - Where code changes take effect (local vs container)
   - How to execute tests
   - How to install dependencies

4. **Persist this knowledge**
   - Create mental model that persists across tasks
   - Update CLAUDE.md with environment notes (if permitted)
   - Never repeat environment discovery for the same project

**Mixed Environment Critical Understanding:**

When both local files AND containers exist:

**UNDERSTAND THIS DUALITY:**

- Local repo files ≠ Files inside running container
- Editing local file does NOT affect running container automatically
- Changes in running container are NOT tracked in git
- **NEVER edit files directly inside running containers**

**Correct Workflow:**

1. Edit local files in the repository
2. Either: Rebuild container (`docker-compose build --no-cache`)
3. Or: Copy file to container temporarily for testing (`docker cp`)
4. Always remember: Container changes are ephemeral, repo changes persist

**Environment-Specific Best Practices:**

**For Docker/Container Environments:**

- Always verify volume mounts before making changes
- Check container health and logs regularly
- Understand difference between `docker-compose up --build` (incremental) vs `--build --no-cache` (full rebuild)
- Use `docker exec` for investigation, never for permanent changes

**For Python Virtual Environments:**

- Always verify active environment before installing packages
- Use `which python` to confirm correct interpreter
- Activate venv before running any Python commands

**For Node.js Environments:**

- Check `node --version` and `npm --version` match project requirements
- Always commit `package-lock.json` or `yarn.lock`

---

### THIS PROJECT'S ENVIRONMENT CONFIGURATION

**CRITICAL PROJECT-SPECIFIC GUIDANCE (Updated: 2025-11-14)**

This project uses a **mixed environment approach** that MUST be understood:

#### Environment Strategy

**1. Local `.venv` (Virtual Environment with UV)**

- **Purpose:** Development, testing, linting, type checking
- **Location:** `.venv/` directory at project root
- **Managed by:** UV 0.9.18 (MUST match across all environments)
- **Connects to:** Dockerized services via localhost port mappings

**2. Docker Containers (docker-compose)**

- **Purpose:** Infrastructure services, production-like deployment testing
- **Services:** PostgreSQL, Redis, MinIO, Grafana, Flyway
- **Networking:** Internal Docker network (`db:5432`, not `localhost`)
- **Code mounting:** Local `src/` mounted read-only for hot-reload

#### Critical Rules for This Project (MANDATORY - NO EXCEPTIONS)

1. **✅ ALWAYS edit code locally** in your IDE, never inside containers
2. **✅ ALWAYS test in `.venv`** via `make test`, not in containers
3. **✅ ALWAYS rebuild Docker after adding dependencies** via `make docker-rebuild`
4. **✅ NEVER commit environment-specific values** (use localhost in .env)
5. **✅ UNDERSTAND the persistence**: `.venv` persists on your machine, containers are ephemeral
6. **✅ VERIFY volume mounts**: Code changes auto-reload, dependency changes need rebuild

#### Version Consistency (CRITICAL - ENFORCED ACROSS ALL ENVIRONMENTS)

**All environments MUST use UV 0.9.18:**

| Environment       | Configuration File        | Required Version |
| ----------------- | ------------------------- | ---------------- |
| Local `.venv`     | `uv --version`            | 0.9.18           |
| CI/CD (GitHub)    | `.github/workflows/*.yml` | 0.9.18           |
| Pre-commit Hooks  | `.pre-commit-config.yaml` | 0.9.18           |
| Docker Containers | `docker/Dockerfile.*`     | 0.9.18           |

**If versions mismatch:**

- ❌ Lock file incompatibility (uv.lock format differences)
- ❌ CI/CD failures ("uv.lock is inconsistent" errors)
- ❌ "Works locally but not in CI" bugs
- ❌ Dependency resolution differences between environments

**Verification command:**

```bash
# Check local UV version
uv --version  # Must output: uv 0.9.18

# If mismatch, reinstall:
curl -LsSf https://astral.sh/uv/0.9.18/install.sh | sh
```

#### Environment Variables: DATABASE_URL Pattern

**CRITICAL UNDERSTANDING:**

DATABASE_URL hostname differs across environments:

| Environment       | Hostname Value | Reason                    |
| ----------------- | -------------- | ------------------------- |
| Local `.venv`     | `localhost`    | Docker port mapping       |
| Docker containers | `db`           | Internal Docker network   |
| CI/CD             | `localhost`    | GitHub service containers |

**Solution (ALREADY IMPLEMENTED):**

- Your `.env` file uses `localhost`
- `docker-compose.yml:184` automatically overrides to `db` for containers
- **YOU DO NOT NEED TO CHANGE THIS** - it's handled automatically

```bash
# .env file (correct for local development)
DATABASE_URL=postgresql+asyncpg://starter_user:password@localhost:5432/starter_db

# docker-compose.yml automatically overrides for containers:
environment:
  DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

#### Dependency Management Workflow for This Project

**MANDATORY STEPS when adding/updating dependencies:**

```bash
# Step 1: Add dependency locally (updates pyproject.toml and uv.lock)
uv add package-name

# Step 2: Install in local .venv
uv sync

# Step 3: Test locally (BEFORE rebuilding Docker)
make test

# Step 4: CRITICAL - Rebuild Docker images (don't skip this!)
make docker-rebuild
# Or for clean rebuild:
docker-compose build --no-cache

# Step 5: Commit BOTH files
git add pyproject.toml uv.lock
git commit -m "Add package-name dependency

- Researched: [link to package docs]
- Version: [version number]
- Reason: [why this dependency]
- Verified: Latest stable version, actively maintained
"
```

**Why rebuild Docker?**

- Docker images cache installed packages in builder stage
- Adding dependency locally updates `.venv`, NOT container Python environment
- Without rebuild: tests pass locally, but container deployment fails

**Common mistake pattern:**

1. Developer runs `uv add requests`
2. Tests pass locally ✅
3. Commits and pushes to CI ✅
4. CI passes (uses fresh uv sync) ✅
5. Deploy to Docker environment ❌ FAILS - package not in container

**Prevention:** Always rebuild after dependency changes.

#### Hot-Reload Behavior (Volume Mounts)

**How it works:**

```yaml
# docker-compose.yml
volumes:
  - ./src:/app/src:ro # Read-only mount
```

**Implications:**

- **Code changes** (`.py` files in `src/`): Auto-reload in containers ✅
- **Dependency changes** (new packages): Requires rebuild ❌
- **Configuration changes** (`.env`): Requires container restart
- **Read-only mount** (`:ro`): Prevents accidental edits inside container ✅

**Developer workflow:**

1. Edit `src/api/routes/users.py` locally
2. Save file
3. FastAPI auto-reloads in container (via `uvicorn --reload`)
4. Changes immediately visible at `http://localhost:8000`
5. **NO CONTAINER REBUILD NEEDED** for code changes

#### Environment Awareness Checklist for This Project

**Before starting any task, verify:**

- [ ] UV version is 0.9.18 (`uv --version`)
- [ ] Docker Desktop is running (`docker ps`)
- [ ] Services are healthy (`make monitor`)
- [ ] `.env` uses `localhost` for DATABASE_URL
- [ ] Understand: edit locally, test in `.venv`, services in Docker
- [ ] Know when to rebuild: dependency changes only

**First-time project setup:**

- [ ] Read GETTING_STARTED.md "Understanding the Development Environments"
- [ ] Run `make bootstrap` (creates .venv, installs deps)
- [ ] Run `make dev-services` (starts Docker services)
- [ ] Run `make test` (verify setup)
- [ ] Confirm understanding of mixed environment approach

**For AI agents working on this project:**

- This environment understanding MUST persist across all tasks
- Never repeat environment discovery - refer to this section
- When adding dependencies, ALWAYS mention rebuild requirement
- When debugging, check BOTH local and Docker environments
- When uncertain, ASK about environment implications

#### Troubleshooting Common Environment Issues

**"Tests pass locally but fail in CI":**

```bash
# Cause: UV version mismatch or dependency sync issue
# Solution 1: Check UV versions match (0.9.18)
uv --version

# Solution 2: Regenerate lock file
uv lock

# Solution 3: Verify CI uses correct UV version
grep UV_VERSION .github/workflows/*.yml
```

**"Tests pass locally but fail in Docker":**

```bash
# Cause: Dependencies not synced to Docker images
# Solution: Rebuild Docker images
make docker-rebuild
```

**"Can't connect to database from local tests":**

```bash
# Cause 1: DATABASE_URL points to 'db' instead of 'localhost'
grep DATABASE_URL .env
# Should be: localhost:5432 (not db:5432)

# Cause 2: Docker services not running
make monitor  # Check service health
make dev-services  # Start if not running
```

**"Code changes not reflecting in container":**

```bash
# For Python code changes: Should be automatic (volume mount)
# Check volume mount exists:
docker inspect starter_api | grep -A5 Mounts

# For dependency changes: Must rebuild
make docker-rebuild
```

---

### Rule 0.6: Dependency Management Consistency

**MANDATORY - BEFORE ADDING/CHANGING ANY DEPENDENCY:**

**Research Requirements (use web_search):**

1. **Maintenance Status**: Last commit < 6 months ago? Actively maintained?
2. **Latest Version**: What is the current stable version?
3. **Security**: Any known CVEs or vulnerabilities?
4. **License**: Compatible with project license requirements?
5. **Alternatives**: What are 2-3 alternatives and how do they compare?
6. **Quality**: Good documentation? Active community? Download stats?

**Python Dependency Management:**

**For UV Projects (Preferred):**

```bash
# Add dependency - UV resolves versions
uv add package_name

# Update all dependencies to latest compatible versions
uv lock --upgrade && uv sync

# Show outdated packages
uv pip list --outdated

# CRITICAL: Always commit uv.lock with pyproject.toml
```

**For pip-tools Projects:**

```bash
# Edit requirements.in (NOT requirements.txt)
# Then compile with --upgrade to get latest versions
pip-compile --upgrade requirements.in

# For complete refresh
pip-compile --upgrade --rebuild requirements.in

# Install compiled requirements
pip-sync requirements.txt

# CRITICAL: Commit both requirements.in and requirements.txt
```

**For Basic pip Projects:**

```bash
# Migrate to UV or pip-tools when possible
# If stuck with basic pip:
pip install package_name==<LATEST_VERSION>
pip freeze > requirements.txt
```

**Node.js Dependency Management:**

```bash
# Check for outdated packages
npm outdated

# Update within semver constraints
npm update

# Update to latest (after research!)
npm install package_name@latest

# Check security vulnerabilities
npm audit
npm audit fix  # Review changes carefully

# CRITICAL: Always commit package-lock.json
```

**Dependency Selection Criteria (MANDATORY Checklist):**

- [ ] Last commit < 6 months ago (actively maintained)
- [ ] Latest stable version identified via web_search
- [ ] No known security vulnerabilities (check CVEs)
- [ ] License compatible with project
- [ ] Good documentation and examples available
- [ ] Evaluated 2-3 alternatives with pros/cons
- [ ] Not excessive transitive dependencies
- [ ] Community adoption verified (but not sole criteria)

**Red Flags - REJECT These Dependencies:**

❌ Last commit > 1 year ago (unmaintained)  
❌ Open security vulnerabilities without patches  
❌ Incompatible license (e.g., GPL in commercial project)  
❌ Excessive dependencies (adds 50+ packages)  
❌ Alpha/beta/RC versions for production  
❌ No documentation or examples  
❌ Deprecated by maintainers

**See @fix.md for comprehensive dependency management workflows**

**CRITICAL WARNING:**

- Fixing integration/architectural bugs by editing small, localized code blocks without proper consideration for the overall codebase often creates new issues
- This "whack-a-mole" approach masks existing problems and makes identifying and fixing the root cause even more difficult
- When in doubt about classification, escalate to a higher category (treat as more complex)

**General Bug-Fixing Principles:**

1. Classify the bug using the taxonomy above
2. For Categories 3-5: Research root cause thoroughly before attempting any fix
3. For Categories 1-2: Verify true isolation before proceeding
4. Always consider impact on the entire codebase, not just the immediate area
5. Consult with user if unclear about system-wide implications
6. Document your classification reasoning in commit message

**Emergency Bug Fix Protocol:**

When production is down and users are actively impacted, normal methodology can be temporarily adapted:

**IMMEDIATE (< 5 minutes):**

- Apply minimal hotfix to restore service
- Document EXACTLY what was changed and why
- Flag commit with `[EMERGENCY_FIX]` or `[HOTFIX]` prefix
- Create tracking ticket immediately
- Notify team of temporary measure

**SHORT-TERM (< 24 hours):**

- Analyze root cause thoroughly using proper bug classification
- Determine if emergency fix masked a Category 3-4 bug
- If yes: Schedule proper fix with design review
- Document in post-mortem template

**MEDIUM-TERM (< 1 week):**

- Implement proper solution following full methodology
- Replace/remove emergency fix
- Update monitoring to catch similar issues earlier
- Conduct post-mortem: Why did this reach production?

**CRITICAL UNDERSTANDING:**

- Emergency fixes are TECHNICAL DEBT, not solutions
- They MUST be tracked and replaced, not forgotten
- If you use emergency protocol more than once per quarter, your testing/monitoring needs improvement
- Document emergency fixes in a dedicated `EMERGENCY_FIXES.md` tracker (if one exists)

### Rule 1: NO Trial-and-Error Development

**ABSOLUTELY FORBIDDEN:**

- Iterative debugging or blind "try this" approaches
- Playing whack-a-mole with bugs
- Code-fixing approaches that mask underlying root causes
- Creating a cascade of improper implementations that dig a bigger hole

**MANDATORY APPROACH:**

- Research FIRST, implement ONCE based on evidence
- Understand the problem completely before proposing solutions
- If research is insufficient, ASK the user before proceeding

### Rule 2: Evidence-Based Development ONLY

**ALL code changes MUST cite supporting evidence from:**

- Datasheets in `knowledge/` folder (if applicable to project)
- Vendor examples in `libraries/` folder (if applicable to project)
- Official API documentation
- Existing verified patterns in codebase

**Research Time-Boxing:**

To prevent analysis paralysis while maintaining rigor, follow this escalation pattern:

**1. QUICK CHECK (15 minutes maximum):**

- Check official documentation for the specific version in use
- Search existing codebase for established patterns
- Review inline comments and citations for similar implementations

**Decision Point:**

- ✅ If approach is clear and documented → Proceed with implementation
- ❓ If uncertain or conflicting information → Continue to Deep Research

**2. DEEP RESEARCH (2-4 hours maximum):**

- Comprehensive documentation review (official sources only)
- Security and compliance implications
- Performance characteristics and trade-offs
- Review relevant GitHub issues, RFCs, or standards documents
- Evaluate 2-3 alternative approaches

**Decision Point:**

- ✅ If clear path forward with evidence → Proceed with implementation
- ❓ If genuinely novel problem or unclear trade-offs → Escalate

**3. ESCALATION (Requires explicit approval):**
When to escalate to user/team:

- Research > 4 hours without clarity
- Multiple valid approaches with unclear trade-offs that require domain knowledge
- Requires expertise you don't have (security, compliance, domain-specific)
- Fundamentally novel problem with no established patterns

**How to escalate effectively:**

```
NOT THIS: "I'm stuck, what should I do?"

DO THIS:
"After 4 hours of research, I've identified two approaches:

OPTION A: [Approach with evidence]
  Pros: [List with citations]
  Cons: [List with citations]
  Risk: [Assessment]

OPTION B: [Approach with evidence]
  Pros: [List with citations]
  Cons: [List with citations]
  Risk: [Assessment]

UNCERTAINTY: [Specific unknowns]
RECOMMENDATION: [Your assessment with reasoning]
QUESTION: Which approach aligns with project priorities?
```

**4. SPIKE/POC (1 day maximum, requires approval):**
For genuinely novel problems where research alone cannot reduce uncertainty:

- Time-boxed experiment (8 hours maximum)
- Goal: Reduce technical uncertainty, NOT build production code
- Deliverable: Findings document with evidence for/against approach
- Dispose of POC code after learning (or mark clearly as non-production)

**CRITICAL UNDERSTANDING:**

- Time limits are maximums, not targets
- If you're certain after 10 minutes, proceed
- Research time should be proportional to problem complexity and risk
- Document your research findings for future reference

**Assumptions Framework:**

All engineering involves assumptions. The rule is: DOCUMENT and VALIDATE critical ones.

**ACCEPTABLE ASSUMPTIONS (Document but don't require validation):**

- ✅ Programming language semantics (e.g., JavaScript is single-threaded)
- ✅ Well-established design patterns (e.g., MVC, Observer, Factory)
- ✅ Standard library behavior for current language version
- ✅ Basic computer science principles (Big-O complexity, data structures)
- ✅ HTTP protocol behavior (status codes, headers)

**MUST VALIDATE (With evidence and citations):**

- ⚠️ External API behavior (versions change, read the docs)
- ⚠️ Third-party library behavior (ALWAYS check docs for YOUR version)
- ⚠️ System behavior under load, failure, or edge conditions
- ⚠️ Cross-platform behavior (OS differences, browser compatibility)
- ⚠️ Security assumptions (authentication, authorization, encryption)
- ⚠️ Performance characteristics (latency, throughput, resource usage)
- ⚠️ Business requirements interpretation (clarify with stakeholders)
- ⚠️ Hardware-specific behavior (timing, voltage, protocols for IoT/embedded)

**Documentation Format for Assumptions:**

```typescript
// ASSUMPTION: PostgreSQL connection pool maintains connections across requests
// SOURCE: PostgreSQL 15.2 Documentation, Section 3.4 - Connection Pooling
// URL: https://www.postgresql.org/docs/15/connection-pooling.html
// VERIFIED: 2025-10-28
// RISK IF WRONG: Connection overhead will spike under load
// MITIGATION: Monitor connection pool metrics in production
```

**ABSOLUTE RULE REFINED:**

- NO UNDOCUMENTED assumptions about external system behavior
- NO ASSUMPTIONS about API behavior without current version documentation
- NO GUESSING when verification is possible
- If evidence is unclear or missing after time-boxed research, ASK the user before proceeding

### Rule 3: NO Unauthorized Feature Decisions

**PROHIBITED:**

- Making feature-related decisions without explicit user approval
- Changing UX or functionality without consultation
- Adding features not explicitly requested
- Modifying behavior assumptions without validation

**REQUIRED:**

- Get explicit approval for ANY feature decision
- Consult user for UX or functionality changes
- Propose options, don't make unilateral decisions

### Rule 4: Documentation Philosophy

**Documentation Decision Tree:**

Not all documentation belongs in the same place. Use this decision tree to determine the right format:

**USE INLINE COMMENTS/DOCSTRINGS FOR:**

- ✅ API contracts and usage examples
- ✅ Non-obvious algorithms or business logic
- ✅ Evidence citations (MANDATORY for external APIs/libraries)
- ✅ Workarounds and the reasoning behind them
- ✅ TODOs with context (what, why, by when)
- ✅ Performance-critical sections with optimization notes
- ✅ Security-sensitive code with rationale
- ✅ Hardware-specific timing or behavior (IoT/embedded)

**USE MARKDOWN DOCUMENTATION FOR:**

- ✅ Architecture Decision Records (ADRs) - why we chose this approach
- ✅ Onboarding guides (how to set up dev environment)
- ✅ Deployment procedures and runbooks
- ✅ Post-mortems and incident reports
- ✅ API reference docs (if auto-generated from code comments)
- ✅ Compliance and audit documentation
- ✅ System architecture diagrams and high-level design
- ✅ When user explicitly requests separate documentation

**NEVER USE MARKDOWN FOR:**

- ❌ Duplicating what's already in code comments
- ❌ "How this function works" explanations (use docstrings)
- ❌ Requirements (should be in ticketing/issue system)
- ❌ Code-level details that will drift from implementation

**Priority Hierarchy:**

1. **Self-documenting code** - Clear variable names, function names, structure
2. **Docstrings** - Required for all public APIs, classes, complex functions
3. **Inline comments** - For non-obvious logic, edge cases, workarounds
4. **Evidence citations** - MANDATORY when implementing based on external documentation
5. **Markdown files** - For architecture, procedures, and high-level concepts

**Rationale:**

- Code comments stay synchronized with code (same file, same commit)
- Inline citations provide immediate context during code review
- Separate documentation has its place for architecture and procedures
- Reduces maintenance overhead by avoiding duplication
- Audit trail for compliance and understanding

## 1. Design-First Development

**Before writing ANY code:**

- **Architecture Design**: Define system boundaries, component interactions, and data flows
- **API Contracts**: Specify interfaces, request/response schemas, and error handling patterns
- **Technical Validation**: Assess feasibility, identify dependencies, and evaluate risks
- **Design Approval**: Confirm approach with explicit user validation before implementation

**Required Actions:**

1. Present proposed design with architectural diagram (ASCII or description)
2. List all dependencies and integration points
3. Identify potential failure modes and mitigation strategies
4. Wait for explicit approval before proceeding to implementation

## 2. Evidence-Based Development

**Research Requirements (MANDATORY):**

This pillar is **NON-NEGOTIABLE**. Every implementation decision must be backed by verifiable evidence. Assumptions are the root cause of most bugs and system failures.

### A) Business & Solution Design

- Extract and confirm business objectives from requirements
- Define measurable acceptance criteria
- Document assumptions and get them validated BEFORE proceeding
- Cite requirements documents when implementing features
- **NEVER assume user intent** - always clarify ambiguities

### B) Toolchain & Supply Chain

**ABSOLUTELY CRITICAL:**

- ALWAYS reference the LATEST official documentation
- NEVER assume API signatures, library behaviors, or framework patterns
- NO trial-and-error with APIs - research first
- If documentation is unclear, ASK the user or seek additional sources

**For every external dependency:**

- Verify current version being used in the project
- Check official docs for that specific version
- Note any breaking changes or deprecations
- Document known issues or limitations
- Cite documentation source in code comments with date

**Citation Standard:**

```typescript
// Implementation follows Next.js 15 App Router documentation:
// https://nextjs.org/docs/app/building-your-application/routing
// Verified: 2025-10-28
// Key pattern: Server Components are default, use 'use client' for client components
```

**Project-Specific Evidence Sources (when applicable):**

```typescript
// Reference: knowledge/ESP32_datasheet.pdf, Section 4.2.3
// Verified behavior: GPIO pins require 10ms settling time
// Vendor example: libraries/vendor_examples/gpio_init.c:45-67
```

### C) Security & Compliance

- Identify security requirements before implementation
- Validate against OWASP Top 10 for web applications
- Check compliance requirements (GDPR, HIPAA, SOC2, etc. as applicable)
- Document security decisions and trade-offs

### D) Performance & Scalability

- Define performance requirements upfront
- Identify scalability constraints
- Plan for edge cases and failure scenarios
- Document performance considerations

## 3. Test-Driven Implementation

**Testing Protocol (ENFORCED):**

1. **Tests First**: Write tests before implementation code
2. **Behavior Definition**: Tests must clearly define expected behavior
3. **Coverage Standards**: Minimum 80% code coverage for new code
4. **Test Types Required**:
   - Unit tests for business logic
   - Integration tests for external dependencies
   - Edge case and error condition tests

**Test Structure:**

```typescript
describe("Feature: [Business Capability]", () => {
  it("should [expected behavior] when [condition]", () => {
    // Arrange
    // Act
    // Assert
  });

  it("should handle [error case] gracefully", () => {
    // Error handling validation
  });
});
```

**Implementation Order:**

1. Write failing test(s)
2. Implement minimum code to pass tests
3. Refactor while keeping tests green
4. Add edge case tests
5. Document any test gaps or limitations

## 4. Quality-First Delivery

**Pre-Commit Validation:**

- Run all tests (unit, integration, e2e)
- Execute linters and formatters
- Perform type checking
- Run security scanners (dependency audit, SAST)
- Validate performance benchmarks if applicable

**Code Review Standards:**

- Self-review with focus on:
  - Readability and maintainability
  - Security vulnerabilities
  - Performance implications
  - Error handling completeness
  - Documentation accuracy

**Quality Checklist:**

- [ ] All tests passing
- [ ] No linting errors
- [ ] Type safety verified
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Performance acceptable
- [ ] Error handling complete

## Agent Behavior Standards

### Communication Style

- Ask clarifying questions BEFORE making assumptions
- Present design proposals for review before implementation
- Explain technical decisions with rationale
- Highlight risks and trade-offs explicitly
- Provide implementation estimates when asked

### Code Documentation

**Documentation Hierarchy (in order of priority):**

1. **Self-documenting code**: Clear variable names, function names, and structure
2. **Docstrings**: Required for all public APIs, classes, and complex functions
3. **Inline comments**: For non-obvious logic, edge cases, and workarounds
4. **Evidence citations**: MANDATORY when implementing based on external documentation
5. **Markdown files**: ONLY when explicitly requested by user

**Why This Hierarchy:**

- Code comments stay synchronized with code
- Inline citations provide immediate context during code review
- Separate documentation files drift from reality
- Maintenance burden is reduced

**Citation Format in Code:**

```typescript
/**
 * Initializes the authentication module following OAuth 2.0 specification.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
 * @verified 2025-10-28
 * @param config - OAuth configuration object
 * @returns Initialized auth client
 */
```

### Error Handling

- Always handle error cases explicitly
- Provide meaningful error messages
- Log errors with appropriate context
- Never silently swallow exceptions
- Document expected error conditions

### Iterative Development

- Break large tasks into manageable increments
- Validate each increment before proceeding
- Commit working code frequently
- Seek feedback at logical milestones

## Technology-Specific Guidelines

### API Development

- OpenAPI/Swagger specifications before implementation
- Request/response validation middleware
- Comprehensive error responses with error codes
- API versioning strategy from day one

### Database Operations

- Migration scripts for all schema changes
- Indexing strategy for query performance
- Transaction boundaries clearly defined
- Connection pooling and resource management

### Frontend Development

- Component contract definitions (TypeScript interfaces/props)
- Accessibility standards (WCAG 2.1 AA minimum)
- Responsive design verification
- Performance budgets (Lighthouse scores)

### DevOps & Infrastructure

- Infrastructure as Code (IaC) for all resources
- Environment parity (dev/staging/prod)
- Secrets management (never hardcoded)
- Monitoring and observability from start

## Prohibited Practices

**NEVER:**

- Create dedicated markdown documentation files unless explicitly requested except for plans and reviews or audit reports.
- Create a markdown document to explain what you have coded.
- Create a markdown document as job reporting on your work.
- Use trial-and-error or iterative debugging approaches
- Play whack-a-mole with bugs (masks root causes and creates bigger problems)
- Fix Category 3-5 bugs with localized code changes
- Implement code without design approval for complex features
- Assume library/framework behavior without documentation verification
- Make feature decisions without explicit user approval
- Change UX or functionality without consultation
- Skip tests "to move faster"
- Commit code that doesn't pass CI/CD checks
- Hardcode secrets, credentials, or environment-specific values
- Ignore security warnings or linting errors
- Make breaking changes without migration path
- Over-engineer solutions beyond stated requirements
- Create markdown documentation files unless explicitly requested

## When Uncertain

**CRITICAL: When in doubt, ASK. Never assume.**

If unclear about:

- **Requirements**: Ask clarifying questions, don't guess - assumptions lead to bugs
- **Bug classification**: Ask if unclear which category (1-5) the bug belongs to
- **System behavior**: Research the entire flow, don't make localized fixes blindly
- **Technical approach**: Propose multiple options with trade-offs, wait for approval
- **API behavior**: Look up official documentation first, cite source - NEVER trial-and-error
- **Feature decisions**: Consult user for ANY UX or functionality changes
- **Documentation needs**: Ask if separate docs are needed, default to inline comments
- **Best practices**: Reference industry standards and explain reasoning
- **Security implications**: Err on the side of caution, seek validation
- **Evidence sufficiency**: If research doesn't provide clear answers, ASK before proceeding

**The cost of asking is ALWAYS lower than the cost of fixing wrong assumptions.**

## Context Considerations

The methodology should be applied pragmatically based on context. Rigor should match risk.

### Startup vs. Enterprise Context

**Early-Stage Startup (< 100 users, limited runway):**

- **Design-First**: Lightweight for MVPs, rigorous for core architecture
- **Evidence-Based**: Quick checks sufficient for low-risk changes
- **Test-Driven**: Focus on critical path, not 100% coverage
- **Quality-First**: Prioritize fast iteration over perfection
- **Acceptable**: Category 1-2 bugs can be fixed quickly, focus rigor on Category 3-5

**Growth-Stage Startup (100-10K users, proven model):**

- **Design-First**: Mandatory for new features
- **Evidence-Based**: Deep research for architecture decisions
- **Test-Driven**: 80% coverage target enforced
- **Quality-First**: Balance speed and quality
- **Acceptable**: Emergency protocol when needed, but track and fix properly

**Enterprise/Regulated (10K+ users, high compliance needs):**

- **Design-First**: Comprehensive, with formal review process
- **Evidence-Based**: Full research and documentation trail
- **Test-Driven**: 90%+ coverage, extensive edge case testing
- **Quality-First**: Security and compliance non-negotiable
- **Acceptable**: Emergency protocol rare, requires post-mortem and process improvement

### Risk-Based Application

**LOW RISK** (internal tool, non-critical feature):

- Quick checks and existing patterns sufficient
- Pragmatic testing
- Faster iteration acceptable

**MEDIUM RISK** (customer-facing feature, reversible):

- Standard methodology application
- Good test coverage
- Design review for new patterns

**HIGH RISK** (payments, auth, data loss scenarios, regulated):

- Full methodology rigor
- Security review mandatory
- Compliance verification
- Extensive testing including failure scenarios

**When in Doubt:** Apply more rigor, not less. Shortcuts compound.

## Methodology Success Metrics

To validate that this methodology is working, track these indicators:

### Leading Indicators (Track Weekly)

**Adoption Metrics:**

- % of commits with bug classification in message
- % of code with evidence citations in comments
- % of pull requests following design-first approach
- Usage rate of custom commands (/design, /research, etc.)

**Process Metrics:**

- Average time to root cause identification (should decrease)
- % of bugs properly classified before fixing
- Research escalation rate (should stabilize at 10-15%)
- Emergency protocol usage (should be < 1 per quarter)

**Quality Metrics:**

- Test coverage percentage (target: 80%+)
- Linter/type-checker compliance rate (target: 100%)
- Security scan pass rate (target: 100%)

### Lagging Indicators (Track Monthly)

**Bug Metrics:**

- Bug recurrence rate (same bug fixed multiple times)
- Category 3-5 bugs misclassified as Category 1-2 (should trend to zero)
- Time-to-resolution by bug category
- # of rollbacks due to insufficient analysis

**Quality Metrics:**

- Post-deployment defect rate (should decrease)
- Production incident frequency (should decrease)
- Code review iteration count (should decrease as quality improves)
- Technical debt accumulation rate (should be flat or decreasing)

**Velocity Metrics:**

- Time to first deployment for new features
- Code review turnaround time
- Developer onboarding time (should decrease)

### Red Flags (Investigate Immediately)

- ⚠️ Bug fix time increasing month-over-month (analysis paralysis?)
- ⚠️ Low evidence citation rate < 50% (methodology not being followed?)
- ⚠️ High escalation rate > 25% (guidelines unclear or training needed?)
- ⚠️ Emergency protocol used > once per quarter (testing/monitoring gaps?)
- ⚠️ Engineers working around methodology (too rigid or not providing value?)
- ⚠️ Increasing technical debt despite methodology (shortcuts being taken?)

### Success Indicators (You're Doing It Right)

- ✅ Category 3-5 bugs identified proactively during design
- ✅ Evidence citations becoming habitual (> 80% of code)
- ✅ Research time decreasing as knowledge base grows
- ✅ Post-deployment defects trending downward
- ✅ Code review becoming faster due to higher quality
- ✅ Team members teaching methodology to new hires
- ✅ Retrospectives focusing on "how to improve" not "what went wrong"

### Quarterly Review Checklist

- [ ] Review metrics: Are we trending in the right direction?
- [ ] Team feedback: Is methodology helping or hindering?
- [ ] Adjust time-boxing limits based on actual data
- [ ] Update bug taxonomy with new patterns discovered
- [ ] Share success stories and lessons learned
- [ ] Update this document based on learnings

## Continuous Improvement

- Document patterns that work well
- Record decisions in Architecture Decision Records (ADRs)
- Update this file when new practices emerge
- Learn from code reviews and production issues
- Share knowledge through clear documentation
- Review metrics quarterly and adapt methodology
- Celebrate wins: recognize team members who exemplify methodology

---

**Version**: 2.2
**Last Updated**: 2025-11-14
**Owner**: CTO
**Review Cycle**: Quarterly or as methodology evolves

## Version History

**Version 2.2 (Current):**

- Added dedicated fix.md command file for comprehensive bug fixing workflows
- Added Rule 0.5: Development Environment Awareness (mandatory environment discovery)
- Added Rule 0.6: Dependency Management Consistency (research-first approach)
- Enhanced environment understanding for Docker, containers, venvs, and mixed setups
- Mandated dependency research using web_search before any additions/changes
- Added dependency selection criteria checklist with red flags
- Emphasized environment persistence to prevent repeated trial-and-error
- Added mixed environment awareness (local vs container file duality)
- Integrated environment-specific best practices for Docker, Python, Node.js

**Version 2.1:**

- Enhanced bug taxonomy from 2 to 5 categories with decision tree
- Added Emergency Bug Fix Protocol for production incidents
- Implemented Research Time-Boxing (15 min → 4 hrs → escalation → spike/POC)
- Added comprehensive Documentation Decision Tree (when to use inline vs markdown)
- Refined Assumptions Framework (acceptable vs must-validate)
- Added Methodology Success Metrics (leading/lagging indicators, red flags)
- Added Context Considerations (startup vs enterprise, risk-based application)
- Improved escalation guidance with templates

**Version 2.0:**

- Added CRITICAL DEVELOPMENT RULES section with mandatory anti-trial-and-error approach
- Enhanced bug-handling guidance (introduced 2-category classification: code vs behavior)
- Strengthened evidence-based development requirements (all assumptions must be documented)
- Added explicit prohibition on unauthorized feature decisions
- Revised documentation philosophy (inline comments over separate markdown files)
- Expanded "When Uncertain" section with emphasis on asking vs assuming

**Version 1.0:**

- Original 4-pillar methodology
- Design-First, Evidence-Based, Test-Driven, Quality-First foundations
