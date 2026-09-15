# Business processes in the existing DONA panel

## Implemented

- Home, orders and campaigns display business process cards from the authenticated Workspace snapshot.
- The existing plans are scoped to Probatum, so selecting that brand no longer hides them.
- A process opens its task list, recorded progress and available result links.
- Preparatory tasks use the existing `Dona.runBranch` path. Demo mode cannot dispatch; repeated clicks during a request are ignored. Rendering never dispatches work.
- An agent response does not mark the process complete. Publication and outbound-contact stages do not use the preparatory action.
- Snapshot output allowlists fields and bounds tasks; a plan bound to another process is discarded. No complete raw process state is sent to the browser.

## Validation

19 tests pass across lifecycle, snapshot and UI event tests. A live authenticated Workspace HTTP request returned all three existing business plans with 7/6/6 tasks and the Probatum scope. Published HTML references business assets version 7.4.0.

Browser verification reached the deployed sign-in page and demo. Authenticated task-card clicking and physical-phone verification were not performed. The independent UI event tests verify branch dispatch and duplicate suppression.

## Sales failure discovered during integration

A real request through the panel branch endpoint reached Sales Ops and checked two products, but Gemini returned HTTP 400 while consuming multiple tool responses. Sales execution 68715 failed; the panel endpoint returned an empty body.

The sales model now uses the same OpenAI gpt-5.4 configuration and credential as the existing DONA orchestrator. This uses the existing API account, not a ChatGPT subscription entitlement. No new service was purchased. The former Gemini node was removed after disconnecting it; its definition remains in version history.

## Rollback

Workspace prior active version: `3537770d-54c2-4ea4-b089-e37dbd547ba7`.
Sales prior active version: `b1996540-0c61-4604-8d57-933e8df8e5d4`.
Workspace after task projection: `bfad087c-dc15-4351-94e2-31136872e99e`.
Sales after model replacement: `b85271d4-e92a-42e4-bb78-df13d68ed6bf`.

Revert the affected frontend files through their Git history if needed. Restore only the affected workflow version after comparing current changes. The previous sales version reintroduces the observed model failure.

## Remaining work

- Validated real product catalog and current offer terms.
- Durable recording and verification of task results; the current panel sends preparation requests and preserves responses in conversation history, but does not autonomously advance lifecycle state.
- End-to-end UI verification in an authenticated browser session.
- Complete business acceptance test through purchase, access and support after payment readiness.

The generated `backend/workspace.workflow.ts` predates this narrow production patch. Do not redeploy it over the live graph. `backend/workspace-snapshot.js` contains the updated snapshot code.

## Final integration checks

After the sales model change, the same panel branch endpoint returned HTTP 200, ok=true and a readable answer based on two real product lookups. No prices were fabricated. This verifies the read-and-answer path, not a completed sale.

Apex now catches child branch failures and formats a safe explicit failure without automatic retry. Provider secrets and stack traces are not returned to the panel. The prior Apex version is 97541fed-9f26-4472-a720-46b511104fc8; the new one is d31bcfea-a60f-4639-a638-9bb86f9a0e69. Two dedicated formatter tests cover error privacy and preservation of normal answers.
