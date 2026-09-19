# LumaRig Studio Remote

Companion control surface for LumaRig Studio.

Built iPad-first, with a compact iPhone layout from the same codebase.

## v0.1

- iPad show console
- iPhone compact control layout
- current / next section
- large GO control
- previous / next / play / pause / stop
- section launcher
- 12 background pads
- live mixer faders
- mute / solo
- lighting scenes
- moving-head XY pad
- blackout
- setlist view
- pairing sheet
- reconnecting WebSocket client
- heartbeat
- command IDs
- demo mode
- PWA manifest + service worker
- long-press/context-menu suppression on console controls
- reducer and protocol tests

## Run on the Mac

Install and start:

    npm install
    npm run dev

Vite listens on port 4177 and accepts LAN connections.

Open this from an iPad or iPhone on the same Wi-Fi network:

    http://YOUR-MAC-IP:4177

The default Studio websocket target is:

    ws://lumarig-studio.local:7070/remote

Until LumaRig Studio exposes that endpoint, tap Open Demo Console.

## Build

    npm test
    npm run build

The static bundle is written to dist/.

## Architecture

The remote never owns show state.

LumaRig Studio is authoritative.

The remote receives Studio state and sends small commands such as:

- transport.go
- section.launch
- pad.trigger
- mixer.gain
- lighting.scene
- lighting.xy
- lighting.blackout
- setlist.song

See REMOTE_PROTOCOL.md.

## Next Studio-side lake

LumaRig Studio needs a local remote server that:

1. advertises the Studio Mac on the LAN
2. serves or exposes this remote bundle
3. opens a WebSocket endpoint at /remote
4. requires pairing
5. broadcasts canonical Studio state
6. validates commands
7. ACKs accepted commands
8. rejects stale or invalid commands
9. keeps transport and audio state authoritative on the Mac
