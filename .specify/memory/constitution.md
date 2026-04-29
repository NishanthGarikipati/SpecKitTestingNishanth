<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Principles added:
  - I. Code Quality (new)
  - II. Testing Standards (new)
  - III. User Experience Consistency (new)
  - IV. Performance Requirements (new)
Sections added:
  - Quality Gates
  - Development Workflow
Sections removed: none (template placeholders replaced)
Templates reviewed:
  ✅ .specify/templates/plan-template.md — Performance Goals/Constraints fields already present; no change required
  ✅ .specify/templates/spec-template.md — Acceptance Scenarios + FR pattern already align with Testing Standards and UX Consistency
  ✅ .specify/templates/tasks-template.md — Phase structure supports code quality gates and test tasks; no change required
Follow-up TODOs: none
-->

# SpecKitTestingNishanth Constitution

## Core Principles

### I. Code Quality

All production code MUST pass automated quality gates before merging:

- Linting and static analysis MUST report zero errors (warnings reviewed per PR).
- Code formatting MUST be enforced by the project's formatter with no manual overrides committed.
- Cyclomatic complexity per function/method MUST not exceed 10; exceptions require documented justification.
- Dead code, commented-out blocks, and `TODO`s older than one sprint MUST not be committed without a linked issue.
- Code reviews MUST include at least one peer approval verifying compliance with this principle before merge.

**Rationale**: Consistent, readable code reduces onboarding time, minimises defect density, and makes
automated refactoring safe.

### II. Testing Standards (NON-NEGOTIABLE)

- TDD is the preferred workflow: tests MUST be written and reviewed before implementation begins.
- Unit test coverage MUST not drop below 80% on any merge to the main branch; regressions block merge.
- Every public API contract (REST, CLI, library interface) MUST have at least one integration test.
- Tests MUST be deterministic — no time-dependent, network-dependent, or order-dependent tests without
  explicit isolation (mocks/stubs/fixtures).
- Test naming MUST follow `[unit]_[scenario]_[expectedOutcome]` or equivalent descriptive convention.
- Flaky tests MUST be quarantined and fixed within one sprint; they MUST NOT be silently skipped.

**Rationale**: A reliable test suite is the only mechanism that allows safe, continuous delivery.
Untested code is unshippable code.

### III. User Experience Consistency

- All UI surfaces MUST adhere to the project's design system (tokens, components, spacing, typography).
- Interaction patterns (navigation, form submission, error display, loading states) MUST be consistent
  across every screen or page.
- Error messages presented to users MUST be human-readable, actionable, and free of stack traces or
  internal identifiers.
- Accessibility: interactive elements MUST meet WCAG 2.1 AA contrast and keyboard-navigation requirements.
- Any deviation from the design system MUST be approved by a UX review and documented.

**Rationale**: Users build mental models from consistent interfaces. Inconsistency erodes trust and
increases support burden.

### IV. Performance Requirements

- API p95 response time MUST be ≤ 200 ms under baseline load conditions.
- Page / screen initial load time MUST be ≤ 3 s on a standard broadband connection (10 Mbps+).
- Core Web Vitals (LCP, FID/INP, CLS) MUST score in the "Good" range for web surfaces.
- N+1 query patterns are PROHIBITED; all data-access layers MUST be reviewed for query efficiency.
- Performance benchmarks MUST be run in CI on every PR that touches data-access or rendering paths;
  regressions of > 10% block merge.

**Rationale**: Performance is a feature. Slow products lose users; degraded performance in production
is harder and costlier to fix than catching it at review time.

## Quality Gates

The following gates MUST pass before any branch is merged to `main`:

- [ ] All linting and static-analysis checks green
- [ ] Unit test coverage ≥ 80% (enforced by CI)
- [ ] No new cyclomatic complexity violations (threshold: 10)
- [ ] At least one integration test covering any changed public contract
- [ ] Performance benchmarks within 10% of established baselines
- [ ] Peer code review approved (minimum 1 reviewer)
- [ ] No accessibility regressions on UI changes (automated axe / Lighthouse checks)

## Development Workflow

1. **Branch**: Create a feature branch from `main` following `###-feature-name` naming.
2. **Test first**: Write tests that describe the desired behaviour before writing implementation code.
3. **Implement**: Develop against the failing tests; keep commits atomic and focused.
4. **Quality check**: Run the full quality gate suite locally before opening a PR.
5. **Review**: Open a PR; reviewer MUST verify constitution compliance, not just logic correctness.
6. **Merge**: Squash-merge after all gates pass; delete the feature branch.
7. **Observe**: Monitor performance metrics and error rates for 24 hours post-deploy.

## Governance

This constitution supersedes all other development practices and guidelines for this project.

- **Amendments** require: a written proposal referencing the affected principle, at least one team
  approval, a documented migration plan for existing code, and a version bump per the semantic
  versioning policy below.
- **Versioning policy**:
  - MAJOR: Removal or backward-incompatible redefinition of a core principle.
  - MINOR: Addition of a new principle or material expansion of an existing one.
  - PATCH: Wording clarifications, typo fixes, non-semantic refinements.
- **Compliance review**: All PRs MUST include a constitution compliance check. Quarterly audits MUST
  sample 10% of merged PRs to verify gate adherence.
- **Disputes**: Escalate to the project lead; resolution MUST be documented as a constitution patch
  or amendment within one sprint.

**Version**: 1.0.0 | **Ratified**: 2026-04-29 | **Last Amended**: 2026-04-29
