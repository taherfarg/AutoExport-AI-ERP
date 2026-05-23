# Phase 23 Mobile Navigation And E2E Reliability Design

## Scope

This continuation of Phase 23 improves the phone-sized ERP shell and removes remaining fixed sleeps from the main end-to-end workflow.

## Mobile UX

The existing mobile nav exposed only five links, which made many completed DMS modules hard to reach on phones. The new shell keeps four high-frequency actions in a fixed bottom command bar and adds a More drawer that exposes every unlocked or locked module with active-state context.

## Test Reliability

The main E2E flow should wait for saved business state instead of sleeping for one second and hoping the page caught up. Existing action checks now reuse `reloadAndExpectVisible`, which reloads and asserts the actual persisted UI result.

## Acceptance Criteria

- Mobile users can open an all-modules menu from the bottom nav.
- Service Workshop, Parts Inventory, Accounting, Export, Marketing, AI, and other secondary modules are reachable on mobile.
- No `waitForTimeout(1000)` calls remain in the main E2E workflow.
- Full verification remains green.

