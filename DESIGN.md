# Bilcode Monitoring interface

A personal operations workspace for connecting Bilcode sessions, controlling project polling, and checking WhatsApp delivery. The main decision is whether the account and gateway are ready to run; monitoring status and the next action take priority over activity counts.

## Direction

The UI UX Pro Max searches were reviewed against this existing web app. The generated operations landing/glassmorphism result did not fit an authenticated control panel. The verified `minimalism-and-swiss-style` match was selected instead: clear grids, high contrast, restrained effects, and functional grouping. Next.js navigation guidance and mobile fixed-navigation clearance informed implementation.

Retain the selected Nova foundation: IBM Plex Sans, one blue action accent, Lucide icons, and square controls. A navy navigation rail separates workspace navigation from white working surfaces. Light and dark themes use explicit semantic color pairs. Green/amber/red only describe actual statuses. No illustrative assets, decorative telemetry, invented counts, or charts.

Energy 2/5, rhythm 3/5, motion 1/5. UI UX Pro Max variance 4/10 and density 6/10 inform the layout. Primary actions use blue; panels and typography provide hierarchy. Short color transitions signal interaction; reduced motion is honored.

## Layout

- Desktop: fixed 238px sidebar, top workspace/account bar, maximum 1400px content area. Sidebar includes real navigation, a static description of the notification flow, and the signed-in operator.
- Tablet: content panels stack before becoming cramped; connection summaries can sit side by side.
- Mobile: sticky compact header and five-item bottom navigation with safe-area padding. The content reserves space for both bars. Controls are at least 44px high, text inputs use 16px text, forms stack, and tables become labeled records under 480px.
- Content uses 16/20/24/28/32/40px spacing by hierarchy, with tabular figures for timing/counts.

## Page priorities

- Overview: actual counts and configured interval, followed by monitoring action panel, connection states, and recent checks. Empty states explain how records will appear.
- Session: connect/validate/start progression; email OTP first. Cookie import is a native expandable alternative. Validation stays visible outside that disclosure. Stored-session timestamps and removal follow below.
- Configuration: editable settings grouped by polling, destination, gateway, and alerts; delivery tests remain in a separate supporting panel with confirmation before sending.
- Logs: real server records, keyboard-operable filters, pagination, and responsive labeled records. JSON details stay in a dialog.
- Bids: cached project descriptions lead to one explicit confirmation. The confirmation states AI data sharing, amount zero, and immediate submission. Recorded bids show raw upstream status separately from delivery progress and WhatsApp transitions. Project and application groups remain separate so an available project cannot be mistaken for an accepted bid. Square status accents reuse the operations palette; the submit arrow denotes an outgoing proposal.
- Bid results: the server message and next action lead each result, followed by stage/HTTP/code facts. The left status border distinguishes confirmed, failed, and uncertain results using the existing semantic palette. Response JSON is secondary disclosure; full history uses a paginated, scrollable dialog to keep the primary project list readable. Facts stack on phones, long text wraps, and dialog focus returns to its trigger. Historical responses remain separate from current Bilcode status.
- Login: product purpose on a navy surface and a distinct form surface, with theme control and clear distinction between panel login and Bilcode login.

## Verification

Check desktop/tablet/phone widths, light/dark themes, overflow, login and logout, navigation and active states, OTP and cookie disclosure, validation placement, log tabs/records/dialogs, confirmation dialogs, keyboard focus, and content clearance above mobile navigation. Avoid real upstream OTP requests or WhatsApp messages during visual checks; use explicit browser fixtures where data is needed.
