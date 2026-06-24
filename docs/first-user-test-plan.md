# VShare First User Test Plan

## Goal

Validate that a new user can understand VShare, enter demo mode, choose interests, use the feed, save an item, and understand the Profile command center without help.

## Test steps

1. Open the homepage.
2. Go to login and select **Continue in demo mode**.
3. If prompted, choose at least three interests.
4. Open the feed.
5. Read or view at least three feed items.
6. Save one item.
7. Open Saved and confirm the item appears.
8. Open Explore and change interests.
9. Return to Feed and confirm the feed feels updated.
10. Open Profile and review:
    - Growth Score
    - Current Goal
    - Next Action
    - Top Constraint
    - Streak
    - Saved Items
11. Use the mobile bottom navigation between Feed, Explore, Saved, and Profile.
12. Open `/api/health` and confirm it returns healthy local mode.

## What to observe

- Does the user understand what to do first?
- Does “Continue in demo mode” feel safe and clear?
- Do interest choices feel obvious?
- Does the feed feel readable on mobile?
- Does the Save action feel immediate?
- Does the Saved page clearly confirm the saved item?
- Does Profile feel like a simple command center rather than a dashboard dump?
- Are buttons large enough and easy to tap?
- Does navigation feel obvious on mobile?
- Are there any console errors, freezes, hydration warnings, or dead clicks?

## Success criteria

- User reaches the feed in under one minute.
- User can save an item without instruction.
- User can find the saved item.
- User can explain their next recommended action from Profile.
- User can navigate all four main tabs on mobile.
- No blocking errors or freezes occur.

## Bugs to record

For each issue, record:

- Page or route
- Device and viewport size
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshot or screen recording if available
- Severity: blocker, confusing, visual, or minor
