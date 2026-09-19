# LumaRig Remote Protocol v0.1

Transport: WebSocket JSON.

Default development endpoint:

    ws://lumarig-studio.local:7070/remote

## Client hello

Fields:

- type: hello
- clientName
- clientVersion
- pin

## Studio messages

The Studio can send:

- welcome with sessionId and full state
- state with the latest canonical state
- ack with command id
- error with optional command id
- pong

Every Studio state has a monotonically increasing revision.

The remote must not overwrite newer state with an older revision.

## Command envelope

Fields:

- type: command
- id: unique command id
- command: command name
- payload: command-specific data

Studio returns ack or error with the same id.

## Commands

Transport:

- transport.play
- transport.pause
- transport.stop
- transport.go
- transport.previous
- transport.next

Sections:

- section.launch with payload id

Pads:

- pad.trigger with payload id
- pad.release with payload id

Mixer:

- mixer.gain with payload id and gainDb
- mixer.mute with payload id and muted
- mixer.solo with payload id and solo

Lighting:

- lighting.scene with payload id
- lighting.xy with payload x and y from 0 to 1
- lighting.blackout with payload enabled

Setlist:

- setlist.song with payload id

## Safety

The Studio Mac remains authoritative.

Studio should reject remote commands when:

- the client is not paired
- the session is stale
- a song, section, channel, pad, or scene does not exist
- Performance Lock blocks the action
- a command is stale relative to the current show revision
- a client exceeds rate limits

STOP and blackout must execute in Studio. They must not depend on browser animation state.

## Heartbeat

Remote sends ping every five seconds.

Studio responds with pong.

If the connection closes, the remote retries with exponential backoff up to eight seconds.
