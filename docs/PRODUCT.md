# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary (now): judges of the "CHIROQCHI IT & ENGLISH TALENT SELECTION — 2026" contest (topic 13, "Pulim qayerga ketyapti?"). They open the site on Monday during a short presentation and must understand within a minute that this is a real, working product, not a demo.
- Next: ordinary people in Chiroqchi and Uzbekistan who use cash and cards, often on phones, and lose track of where money went by month end.

## Product Purpose
Mizan answers "how much can I spend today?" from what the person enters: cash on hand, next income date, bills, debts and a savings goal. Records expenses in two taps, tracks debts and goals, explains the arithmetic. Success: a person keeps writing for days and knows their daily limit.

## Positioning
A daily spending plan computed by an open formula (cash − bills − debt dues − goal reserve) ÷ days to income, with cash and card in one place, in Uzbek first, plus a Telegram bot sharing the same account and database. No bank connection; the user enters everything.

## Operating Context
Web app + PWA (React/Vite), Node + SQLite server, Telegram bot @mizan_uzbot. Landing site is hash-routed inside the same app (`frontend/src/pages/Site.jsx`), with a live app embedded in device frames (`?demo=1`, separate sample data). Presented from a laptop; judges may open the link on their phones.

## Capabilities and Constraints
- Works now: records, daily plan, debts, goals, reports, rule-based assistant (4 languages, no LLM), accounts with server sync, recovery code, Telegram bot, export/delete.
- Depends on device: voice input (browser speech, Uzbek unreliable).
- Not yet: real users, income, bank integration, permanent hosting/domain, independent security audit.
- Must run smoothly on low-end PCs and phones.

## Brand Commitments
- Name: Mizan (renamed from Pulim). Contest phrase "Pulim qayerga ketdi?" stays.
- Site copy is fixed: redesigns must not change text content or data.
- Voice: honest, plain Uzbek; no "AI" hype, no invented claims, no "estimate" wording.
- The live phone with the real app inside stays on the landing page.
- Must not feel toy-like/over-colourful, and must not be slow or heavy.

## Evidence on Hand
Working product, automated tests (server ~99, frontend 28), live Telegram bot. No testimonials, users, pricing, partners or press: never fabricate them.

## Product Principles
1. Prove by showing the real app working, not by claims.
2. Honesty over polish: say what is not done.
3. Two taps to record; forgiving when days are missed.
4. Uzbek first, works on a cheap phone.
