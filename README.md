# LumaRig Studio Remote

Companion performance surface for LumaRig Studio.

Built iPad-first, with a compact iPhone layout from the same codebase.

## Product contract

The remote follows the same model as the Mac app:

**Setlist → Song Arrangement → Performance**

The Mac app owns the remote session and canonical show state. The remote is only a control surface.

## Pairing flow

1. Open **Devices → Remote Control** in LumaRig Studio on the Mac.
2. Studio creates the Supabase Realtime session and displays a 6-digit pairing code.
3. Open the remote on iPad or iPhone.
4. Enter that code.
5. The remote joins the Studio-created session and receives canonical show state.

The companion never creates the Studio session.

The browser stores the paired session capability locally so reopening the PWA can resume until the Studio session expires.

## Current controls

- current Song and next Song
- current Section and next Section
- large GO control
- previous / next Section
- dedicated NEXT SONG control
- play / pause / stop
- direct Section launch
- direct Song selection from the Setlist
- Studio-defined background pad bank with ready/active state
- audio-track mixer faders
- mute / solo
- lighting scene surface
- capability-aware moving-head XY surface, disabled until Studio advertises support
- blackout
- Supabase Realtime command relay
- command acknowledgement + timeout
- stale-state rejection
- demo mode
- PWA manifest + service worker
- iOS long-press/context-menu suppression
- reducer and protocol tests

## GO versus NEXT SONG

These are deliberately different actions.

**GO** advances to the next Section inside the current Song.

**NEXT SONG** asks Studio to stop the current Song, load the next Song in the Setlist, reset to its first Section, and leave the Setlist at the end instead of wrapping.

## Studio parity

The demo data mirrors the Mac `build/v0.2-audio-engine` branch:

- Sunday Morning
- 8 Songs
- the same BPM, key, duration and order
- the same Section structure
- the same 12 Pad names
- audio mixer channels mapped to Click, Guide, Drums, Bass, Keys, Guitar, Vocals and Other

MIDI and lighting are not presented as live until the Mac runtime reports those engines. Lighting scenes and blackout follow LumaRig connectivity; XY remains disabled while Studio reports `xySupported: false`.

## Development

    npm install
    npm run dev

## Build

    npm test
    npm run build

The static bundle is written to `dist/`.

## Production

The Vercel project is connected to this repository and deploys `main`.

Production URL:

    https://lumastudio-remote.vercel.app

## Protocol

See `REMOTE_PROTOCOL.md`.
