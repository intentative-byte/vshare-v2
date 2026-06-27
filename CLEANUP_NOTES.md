# DAX GOLD PLUS v7 LEARNING READY — Cleanup Notes

## Removed / simplified

| Item | Reason |
|------|--------|
| `OPPORTUNITY_QUEUE`, `QUEUE_*` counters | Unused queue stub (ADD-43 timeline not wired in v7) |
| `update_opportunity_queue`, `classify_queue_status`, `queue_score` | Never called; no production effect |
| `edge_key_from_exit` | Unused helper; edge vault uses inline keys |
| `AUTO_EVIDENCE_RUNNING` | Unused flag |
| `SESSION_HIT_KEYS` | Set reset but never read |
| `intel_action` | UI handler with no button wired |
| Duplicate LATE/VERY_LATE block in `build_candidate()` | Merged into one equivalent gate |
| Excessive blank lines / redundant imports | Readability only |

## Fixed

| Item | Change |
|------|--------|
| `session_score_display()` | `wr_line` computed inside function before return (original had broken indentation) |
| `clean_live_orders(orders)` | Restored as filter helper (live order states) |
| `build_candidate(symbol, snapshot)` | Restored original auth, gap, geometry, telemetry, late-entry gates |
| `scan_market()` / `rank_candidates()` | Restored original scan loop and auth/pct sort |
| `get_executable_candidates(ranked, live_registry)` | Restored original slot/sector/kill-switch logic |
| `governed_execute(executable, user_command)` | Restored manual EXECUTE gate and bracket flow |
| `DAXScreen.run_scan()` | Restored full scan → rank → execute pipeline output |
| UI buttons | All 17 original actions: SCAN, EXECUTE, JOURNAL, EARLY INTEL, EXIT MANAGER, AUTO INTEL, SESSION, REPORT, POST EXIT CHECK, POSITIONS, CANCEL ORDERS, CLOSE ALL, COPY, RESET, PULL PLUG, LEARNING, READY CHECK |

## Preserved unchanged

- All safety controls: kill switch, paper API, manual EXECUTE gate, EOD flat, exit governor
- ADD-16 through ADD-30 learning layers (telemetry, memory, optimizer, response, edge vault, exit validator, dashboards)
- ADD-31–42 scan-time early entry intelligence
- ADD-43–50 early watchlist / countdown UI layer
- Journal logging, evidence dashboard, learning dashboard, Monday readiness check
- API key variable names

## Build

- **File:** `DAX_GOLD_PLUS_v7_LEARNING_READY.py`
- **Lines:** ~3237
- **Syntax:** `python3 -m py_compile` passes on Linux
- **Runtime:** Pythonista iOS (`ui`, `clipboard`, `requests`)

## Research branch (ADD-43–52)

Not included in this file — production v7 remains frozen per spec. Promote research layers only after replay evidence.
