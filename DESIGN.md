# Design direction

Reading this as: an operations panel for one Bilcode operator, in a quiet, practical control-room style, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

The user delegated the shadcn preset and interface decisions. Use the New York preset with Radix components, neutral surfaces, and an emerald action color. The primary decision is whether monitoring should run, and whether its credential is usable.

The product name is a text wordmark, not a fabricated logo. Navigation follows four actual tasks: Ringkasan, Sesi Bilcode, Log & riwayat, and Konfigurasi. A compact top navigation becomes a wrapping two-column navigation on phones; there is no decorative sidebar.

The monitoring control is the focal point. Supporting session and delivery facts use definition lists. Real logs use tables, with horizontal scroll contained inside their region when necessary. All numbers come from PostgreSQL, with honest empty states on a new install.

DM Sans is bundled locally for readable Indonesian instructions and dense timestamps. Monospace is restricted to JSON and technical identifiers. Phosphor icons are chosen for their literal operation (play, stop, upload, clock, connection, and settings), rather than decoration. Status labels carry words and use color as a secondary signal.

Light is the starting theme for daytime inspection. A working dark theme is available and persisted. Buttons have small rounded corners; panels have a slightly larger radius. Hover and focus transitions provide feedback; there are no looping animations, gradients, glow, fabricated metrics, or decorative media.

The visual signature is a clear running/stopped control surface paired with a chronological inspection table and time labels. Mutations show in-progress feedback, completion, and meaningful errors. Destructive or externally visible actions are named explicitly.
