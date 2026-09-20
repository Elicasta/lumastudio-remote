# LumaRig Studio Remote

Companion performance surface for LumaRig Studio.

Built iPad-first, with a compact iPhone layout from the same codebase.

## Product contract

The remote follows the same model as the Mac app:

**Setlist → Song Arrangement → Performance**

The Mac owns canonical state. The remote sends operator commands and renders the state Studio returns.

## Current controls

- current Song and next Song
- current Section and next Section
- large GO control
- previous / next Section
- dedicated NEXT SONG control
- play / pause / stop
- direct Section launch
- direct Song selection from the Setlist
- 12 background pads
- audio-track mixer faders
- mute / solo
- lighting scene surface
- moving-head XY surface
- blackout
- reconnecting WebSocket client
- heartbeat
- command IDs
- stale-state rejection
- demo mode
- PWA manifest + service worker
- iOS long-press/context-menu suppression
- reducer and protocol tests

## GO versus NEXT SONG

These are deliberately not the same action.

**GO** advances to the next Section inside the current Song.

**NEXT SONG** stops the current Song, loads the next Song in the Setlist, resets to its first Section, and does not wrap at the end of the Setlist.

## Studio parity

The demo data mirrors the current Mac branch build/v0.2-audio-engine:

- Sunday Morning
- 8 Songs
- the same BPM, key, duration and order
- the same Section structure
- the same 12 Pad names
- audio mixer channels mapped to Click, Guide, Drums, Bass, Keys, Guitar, Vocals and Other

MIDI and lighting health are not presented as live in demo state until the Mac runtime actually provides those engines.

## Run locally

    npm install
    npm run dev

Vite listens on port 4177 and accepts LAN connections.

Open this from an iPad or iPhone on the same Wi-Fi network:

    http://YOUR-MAC-IP:4177

The default Studio WebSocket target is:

    ws://lumarig-studio.local:7070/remote

Until the Mac app exposes that endpoint, tap **Open Demo Console**.

## Build

    npm test
    npm run build

The static bundle is written to dist/.

## Protocol

See REMOTE_PROTOCOL.md.

## Studio-side work

Studio still needs the live remote bridge that:

1. exposes canonical Setlist, Song, Section, transport and Track state
2. accepts the v0.2 remote commands
3. authenticates pairing
4. validates command targets
5. ACKs accepted commands
6. rejects stale or invalid commands
7. broadcasts state after every accepted show mutation
8. keeps native audio state authoritative on the Mac
