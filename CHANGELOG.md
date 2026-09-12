# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-09-12

### Fixed
- **engine/reading/drawer.py**: Use `Optional[list]` type hint for `positions` parameter in `draw_cards()` (PEP 484 compliance)
- **engine/reading/drawer.py**: Replace bare `except Exception: pass` with specific exception handling (`FileNotFoundError`, `json.JSONDecodeError`, `OSError`) and logging via `logging.warning`
- **static/js/tarot.js**: Remove duplicate `expandTextBox()` and `contractTextBox()` function definitions that were overwriting the more complete implementations
- **static/css/tarot.css**: Add defensive spacing between cards and candle sections (`min-height: 25vh` for cards, `margin-top: 1rem` for candle)

### Documentation
- **docs/DECISIONS.md**: Added ADR-001 (duplicate function removal rationale), ADR-002 (no prompt changes), ADR-003 (defensive CSS spacing)
- **docs/PLAN_batch1.md**: Execution plan for Batch 1 upgrades