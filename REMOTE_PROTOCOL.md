# LumaRig Remote Protocol v0.2

The remote mirrors the Studio product model:

**Setlist → Song → Sections → Performance**

LumaRig Studio on the Mac remains authoritative. The remote never owns show state.

## Compatibility

The current control protocol is version **1**. Studio includes the protocol version
in every canonical state broadcast. The remote refuses incompatible state instead
of guessing at controls.

## Transport

Supabase Realtime Broadcast carries live remote traffic.

Studio owns session creation. The companion receives a capability topic only after it exchanges the 6-digit Studio pairing code through the session Edge Function.

Realtime events:

- `studio_state`: Studio → remotes
- `remote_command`: remote → Studio
- `command_ack`: Studio → remote
- `remote_hello`: remote → Studio, requesting the latest state

The Realtime channel is transport only. Studio remains authoritative and the musical clock stays local on the Mac.

Every Studio state has a monotonically increasing revision. The remote ignores stale state revisions.

## Command envelope

Fields:

- type: command
- id: unique command id
- command: command name
- payload: command-specific data

Studio broadcasts `command_ack` with the same id after accepting or rejecting a command.

## Performance semantics

These controls are intentionally separate.

### Section navigation

- transport.go
- transport.previous
- transport.next
- section.launch with payload id

**GO advances the current Song to its next Section. It never changes Songs.**

transport.previous and transport.next are also Section controls.

### Song navigation

- song.previous
- song.next
- song.select with payload id

**NEXT SONG is a separate operator action.**

When the next Song is loaded, Studio should:

1. stop playback
2. load the next Song in the active Setlist
3. reset transport position to zero
4. select the Song's first Section
5. queue its second Section when one exists
6. broadcast the new canonical state

Song navigation does not wrap from the last Song back to the first Song.

## Pads

- pad.trigger with payload id
- pad.release with payload id

## Mixer

- mixer.gain with payload id and gainDb
- mixer.mute with payload id and muted
- mixer.solo with payload id and solo

Mixer channel IDs mirror Studio Track IDs where possible.

## Lighting

- lighting.scene with payload id
- lighting.xy with payload x and y from 0 to 1
- lighting.blackout with payload enabled

Lighting commands remain part of the protocol, but live availability must come from Studio health. The current Studio v0.2 branch does not yet have the final lighting runtime.

## Safety

Studio should reject remote commands when:

- the client is not paired
- the session is stale
- a Song, Section, Track, Pad, or Scene does not exist
- Performance Lock blocks the action
- a command is stale relative to the current show revision
- a client exceeds rate limits

STOP and blackout must execute in Studio. They must not depend on browser animation state.

## Session lifecycle

Studio heartbeats the Supabase session from the Mac app. Pair codes expire separately from the longer-lived show session.

A remote can resume a still-valid paired session from its locally stored capability. When the Studio session expires, the remote must request a new 6-digit code from the Mac app.
