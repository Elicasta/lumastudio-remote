import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Grid2X2,
  Lightbulb,
  Link2,
  ListMusic,
  Pause,
  Play,
  Radio,
  Settings2,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Zap
} from "lucide-react";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import { RemoteClient, loadSavedSession, type ConnectionStatus } from "./remoteClient";
import { initialState, reducer, type View } from "./store";
import type { RemoteCommand, StudioState } from "./protocol";

const nav: Array<{ id: View; label: string; icon: typeof Play }> = [
  { id: "performance", label: "Show", icon: Play },
  { id: "pads", label: "Pads", icon: Grid2X2 },
  { id: "mixer", label: "Mixer", icon: SlidersHorizontal },
  { id: "lighting", label: "Lights", icon: Lightbulb },
  { id: "setlist", label: "Setlist", icon: ListMusic }
];

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [connection, setConnection] = useState<ConnectionStatus>("idle");
  const [connectOpen, setConnectOpen] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<RemoteClient | null>(null);

  useEffect(() => {
    const block = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      event.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  function connect(code = pairCode) {
    void clientRef.current?.disconnect();
    setError(null);

    const client = new RemoteClient(code, {
      onStatus: setConnection,
      onState: (studio) => {
        setDemoMode(false);
        dispatch({ type: "studio", state: studio });
        setConnectOpen(false);
      },
      onError: setError
    });

    clientRef.current = client;
    void client.connect();
  }

  useEffect(() => {
    if (loadSavedSession()) {
      connect("");
    }

    return () => {
      void clientRef.current?.disconnect();
    };
  }, []);

  function demo() {
    void clientRef.current?.disconnect();
    setConnection("connected");
    setDemoMode(true);
    setError(null);
    setConnectOpen(false);
  }

  function command(commandName: RemoteCommand, payload?: Record<string, unknown>) {
    haptic();

    if (clientRef.current && connection === "connected" && !demoMode) {
      clientRef.current.command(commandName, payload);
    } else {
      dispatch({ type: "demoCommand", command: commandName, payload });
    }
  }

  const currentSection =
    state.studio.sections[state.studio.currentSectionIndex] ??
    state.studio.sections[0];
  const nextSection =
    state.studio.sections[
      state.studio.queuedSectionIndex ?? state.studio.currentSectionIndex + 1
    ] ?? currentSection;

  return (
    <div className="remote-shell">
      <TopBar
        studio={state.studio}
        connection={connection}
        onConnect={() => setConnectOpen(true)}
      />

      <div className="remote-body">
        <SideRail view={state.view} onView={(view) => dispatch({ type: "view", view })} />

        <main className="remote-main">
          {state.view === "performance" && (
            <Performance
              studio={state.studio}
              currentSection={currentSection}
              nextSection={nextSection}
              command={command}
            />
          )}
          {state.view === "pads" && <Pads studio={state.studio} command={command} />}
          {state.view === "mixer" && <Mixer studio={state.studio} command={command} />}
          {state.view === "lighting" && (
            <Lighting studio={state.studio} command={command} />
          )}
          {state.view === "setlist" && (
            <Setlist studio={state.studio} command={command} />
          )}
        </main>
      </div>

      <MobileNav view={state.view} onView={(view) => dispatch({ type: "view", view })} />

      {connectOpen && (
        <ConnectSheet
          pairCode={pairCode}
          connection={connection}
          error={error}
          onPairCode={setPairCode}
          onConnect={() => connect()}
          onDemo={demo}
          onClose={() => connection === "connected" && setConnectOpen(false)}
        />
      )}
    </div>
  );
}

function TopBar({
  studio,
  connection,
  onConnect
}: {
  studio: StudioState;
  connection: ConnectionStatus;
  onConnect: () => void;
}) {
  const connected = connection === "connected";

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark">L</span>
        <div>
          <strong>LUMARIG</strong>
          <small>REMOTE</small>
        </div>
      </div>

      <div className="top-song">
        <strong>{studio.song.title}</strong>
        <span>
          {studio.song.artist} · {studio.song.bpm} BPM · {studio.song.key}
        </span>
      </div>

      <div className="top-health">
        <Health name="AUDIO" ok={studio.health.audio} />
        <Health name="MIDI" ok={studio.health.midi} />
        <Health name="LIGHTS" ok={studio.health.lighting} />
      </div>

      <button className="connection-button" onClick={onConnect}>
        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>{connected ? "Connected" : connection}</span>
      </button>
    </header>
  );
}

function Health({ name, ok }: { name: string; ok: boolean }) {
  return (
    <span className="health">
      <i className={ok ? "dot ok" : "dot bad"} />
      {name}
    </span>
  );
}

function SideRail({
  view,
  onView
}: {
  view: View;
  onView: (view: View) => void;
}) {
  return (
    <aside className="side-rail">
      <div className="rail-tabs">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "rail-tab active" : "rail-tab"}
              onClick={() => onView(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rail-footer">
        <Radio size={16} />
        <span>LIVE CONTROL</span>
      </div>
    </aside>
  );
}

function MobileNav({
  view,
  onView
}: {
  view: View;
  onView: (view: View) => void;
}) {
  return (
    <nav className="mobile-nav">
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => onView(item.id)}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Performance({
  studio,
  currentSection,
  nextSection,
  command
}: {
  studio: StudioState;
  currentSection: StudioState["sections"][number];
  nextSection: StudioState["sections"][number];
  command: CommandFn;
}) {
  const progress =
    studio.transport.durationSeconds > 0
      ? studio.transport.positionSeconds / studio.transport.durationSeconds
      : 0;
  const songIndex = studio.setlist.songs.findIndex(
    (song) => song.id === studio.song.id
  );
  const nextSong =
    songIndex >= 0 && songIndex < studio.setlist.songs.length - 1
      ? studio.setlist.songs[songIndex + 1]
      : null;
  const countActive = studio.transport.countInActive;
  const queuedSection = studio.transport.queuedSectionId
    ? studio.sections.find(
        (section) => section.id === studio.transport.queuedSectionId
      )
    : null;

  return (
    <section className="performance-screen">
      <div className="section-strip">
        {studio.sections.map((section, index) => (
          <button
            key={section.id}
            className={
              index === studio.currentSectionIndex
                ? "section-chip current"
                : section.id === studio.transport.queuedSectionId
                  ? "section-chip manual-queued"
                  : index === studio.queuedSectionIndex
                    ? "section-chip queued"
                    : "section-chip"
            }
            onClick={() => command("section.launch", { id: section.id })}
            disabled={countActive}
          >
            <small>{section.startBar}</small>
            <strong>{section.name}</strong>
            <span>
              {section.id === studio.transport.queuedSectionId
                ? "queued override"
                : section.lengthBars + " bars"}
            </span>
          </button>
        ))}
      </div>

      {countActive && (
        <div className="remote-count-in surface">
          <div>
            <div className="eyebrow">MANUAL TRANSITION</div>
            <strong>
              {queuedSection ? "→ " + queuedSection.name : "COUNT-IN"}
            </strong>
          </div>
          <div className="remote-count-number">
            {studio.transport.countInBeat || "•"}
            <span>/ {studio.transport.countInTotal}</span>
          </div>
          <small>Landing on beat 1</small>
        </div>
      )}

      <div className="performance-grid">
        <div className="current-card surface">
          <div className="eyebrow">CURRENT SECTION · AUTO</div>
          <div className="section-hero">{currentSection.name}</div>
          <div className="bar-readout">
            Bar {studio.transport.bar} · Beat {studio.transport.beat}
          </div>
          <div className="show-progress">
            <i style={{ width: Math.min(100, progress * 100) + "%" }} />
          </div>
          <div className="time-row">
            <span>{formatTime(studio.transport.positionSeconds)}</span>
            <span>{formatTime(studio.transport.durationSeconds)}</span>
          </div>
        </div>

        <div className="next-card surface">
          <div className="eyebrow">
            {queuedSection ? "QUEUED OVERRIDE" : "NEXT SECTION · AUTO"}
          </div>
          <h2>{queuedSection?.name ?? nextSection.name}</h2>
          <p>
            {queuedSection
              ? "Count-in calculated from the current beat"
              : nextSection.lengthBars + " bars"}
          </p>
          <button
            className="queue-button"
            disabled={countActive}
            onClick={() => command("section.launch", { id: nextSection.id })}
          >
            Manual Jump
          </button>
        </div>

        <div className="song-next-card surface">
          <div className="eyebrow">NEXT SONG</div>
          {nextSong ? (
            <>
              <h2>{nextSong.title}</h2>
              <p>{nextSong.artist}</p>
              <div className="next-song-meta">
                <span>{nextSong.bpm} BPM</span>
                <span>{nextSong.key}</span>
              </div>
              <button
                className="next-song-button"
                onClick={() => command("song.next")}
              >
                NEXT SONG <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <>
              <h2>End of Set</h2>
              <p>No song is queued after this one.</p>
              <button className="next-song-button" disabled>
                END OF SET
              </button>
            </>
          )}
        </div>
      </div>

      <div className="transport-console">
        <button
          className="transport-key"
          disabled={countActive}
          onClick={() => command("transport.previous")}
        >
          <ChevronLeft size={24} />
          <span>PREV SECTION</span>
        </button>

        <button className="transport-key stop" onClick={() => command("transport.stop")}>
          <CircleStop size={23} />
          <span>STOP</span>
        </button>

        <button
          className="go-button"
          disabled={countActive}
          onClick={() => command("transport.go")}
        >
          GO
          <small>MANUAL OVERRIDE</small>
        </button>

        <button
          className="transport-key"
          onClick={() =>
            command(
              studio.transport.playing || studio.transport.countInActive
                ? "transport.pause"
                : "transport.play"
            )
          }
        >
          {studio.transport.playing || studio.transport.countInActive
            ? <Pause size={23} />
            : <Play size={23} />}
          <span>
            {studio.transport.countInActive
              ? "CANCEL COUNT"
              : studio.transport.playing
                ? "PAUSE"
                : "PLAY"}
          </span>
        </button>

        <button
          className="transport-key"
          disabled={countActive}
          onClick={() => command("transport.next")}
        >
          <ChevronRight size={24} />
          <span>JUMP NEXT</span>
        </button>
      </div>

      <div className="auto-follow-banner">
        Sections follow the Song automatically. Use GO or a section button only
        to override the arrangement.
      </div>

      <QuickConsole studio={studio} command={command} />
    </section>
  );
}

function QuickConsole({
  studio,
  command
}: {
  studio: StudioState;
  command: CommandFn;
}) {
  return (
    <div className="quick-console">
      <div className="mini-pads surface">
        <div className="mini-header">
          <span>PADS</span>
          <small>quick bank</small>
        </div>
        <div className="mini-pad-grid">
          {studio.pads.slice(0, 8).map((pad, index) => (
            <button
              key={pad.id}
              className={pad.active ? "mini-pad active" : "mini-pad"}
              style={{ "--pad": pad.color } as React.CSSProperties}
              onPointerDown={() => command("pad.trigger", { id: pad.id })}
              onPointerUp={() => command("pad.release", { id: pad.id })}
              onPointerCancel={() => command("pad.release", { id: pad.id })}
            >
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="quick-faders surface">
        <div className="mini-header">
          <span>LIVE MIX</span>
          <small>touch faders</small>
        </div>
        <div className="mini-fader-row">
          {studio.mixer.slice(0, 6).map((channel) => (
            <MiniFader key={channel.id} channel={channel} command={command} />
          ))}
        </div>
      </div>

      <XYPad
        x={studio.lighting.x}
        y={studio.lighting.y}
        onChange={(x, y) => command("lighting.xy", { x, y })}
      />
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <span className={ok ? "status-value ok-text" : "status-value bad-text"}>
        <i className={ok ? "dot ok" : "dot bad"} />
        {ok ? "Ready" : "Offline"}
      </span>
    </div>
  );
}

function Pads({ studio, command }: { studio: StudioState; command: CommandFn }) {
  return (
    <section className="page-screen">
      <PageTitle title="Pads" subtitle="Background textures · press and hold for momentary playback" />
      <div className="pads-grid">
        {studio.pads.map((pad, index) => (
          <button
            key={pad.id}
            className={pad.active ? "pad-card active" : "pad-card"}
            style={{ "--pad": pad.color } as React.CSSProperties}
            onPointerDown={() => command("pad.trigger", { id: pad.id })}
            onPointerUp={() => command("pad.release", { id: pad.id })}
            onPointerCancel={() => command("pad.release", { id: pad.id })}
          >
            <span className="pad-number">{index + 1}</span>
            <div className="wave-bars" aria-hidden>
              {Array.from({ length: 36 }, (_, bar) => (
                <i
                  key={bar}
                  style={{ height: 20 + ((bar * 17 + index * 13) % 70) + "%" }}
                />
              ))}
            </div>
            <strong>{pad.name}</strong>
            <small>{pad.active ? "ACTIVE" : "READY"}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function Mixer({ studio, command }: { studio: StudioState; command: CommandFn }) {
  return (
    <section className="page-screen">
      <PageTitle title="Mixer" subtitle="Live show buses · gain, mute and solo" />
      <div className="console-channels">
        {studio.mixer.map((channel) => (
          <div className="console-channel surface" key={channel.id}>
            <div className="channel-name" style={{ color: channel.color }}>
              {channel.name}
            </div>
            <div className="vertical-meter">
              <i style={{ height: channel.meter * 100 + "%" }} />
            </div>
            <input
              className="vertical-fader"
              type="range"
              min="-60"
              max="6"
              step="0.5"
              value={channel.gainDb}
              onChange={(event) =>
                command("mixer.gain", {
                  id: channel.id,
                  gainDb: Number(event.currentTarget.value)
                })
              }
            />
            <strong>{channel.gainDb.toFixed(1)} dB</strong>
            <div className="channel-buttons">
              <button
                className={channel.solo ? "active" : ""}
                onClick={() =>
                  command("mixer.solo", { id: channel.id, solo: !channel.solo })
                }
              >
                S
              </button>
              <button
                className={channel.muted ? "active danger" : ""}
                onClick={() =>
                  command("mixer.mute", { id: channel.id, muted: !channel.muted })
                }
              >
                M
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniFader({
  channel,
  command
}: {
  channel: StudioState["mixer"][number];
  command: CommandFn;
}) {
  return (
    <div className="mini-fader">
      <span>{channel.name}</span>
      <div className="mini-track">
        <i
          className="mini-meter"
          style={{
            height: channel.meter * 100 + "%",
            background: channel.color
          }}
        />
        <input
          type="range"
          min="-60"
          max="6"
          step="0.5"
          value={channel.gainDb}
          onChange={(event) =>
            command("mixer.gain", {
              id: channel.id,
              gainDb: Number(event.currentTarget.value)
            })
          }
        />
      </div>
    </div>
  );
}

function Lighting({ studio, command }: { studio: StudioState; command: CommandFn }) {
  return (
    <section className="page-screen">
      <PageTitle title="Lighting" subtitle="LumaRig show control · scenes, position and blackout" />

      <div className="lighting-page-grid">
        <div className="scene-panel surface">
          <div className="panel-heading">
            <span>SCENES</span>
            <Zap size={16} />
          </div>
          <div className="scene-buttons">
            {studio.lighting.scenes.map((scene) => (
              <button
                key={scene.id}
                className={scene.active ? "scene-button active" : "scene-button"}
                style={{ "--scene": scene.color } as React.CSSProperties}
                onClick={() => command("lighting.scene", { id: scene.id })}
              >
                <i />
                <span>{scene.name}</span>
              </button>
            ))}
          </div>
        </div>

        <XYPad
          x={studio.lighting.x}
          y={studio.lighting.y}
          large
          onChange={(x, y) => command("lighting.xy", { x, y })}
        />

        <div className="lighting-safety surface">
          <div className="eyebrow">SAFETY</div>
          <button
            className={studio.lighting.blackout ? "blackout active" : "blackout"}
            onClick={() =>
              command("lighting.blackout", {
                enabled: !studio.lighting.blackout
              })
            }
          >
            <Lightbulb size={24} />
            {studio.lighting.blackout ? "RESTORE LIGHTS" : "BLACKOUT"}
          </button>
          <p>Blackout only affects lighting output. Audio transport keeps running.</p>
        </div>
      </div>
    </section>
  );
}

function XYPad({
  x,
  y,
  onChange,
  large = false
}: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  large?: boolean;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextX = clamp((event.clientX - rect.left) / rect.width);
    const nextY = clamp((event.clientY - rect.top) / rect.height);
    onChange(nextX, nextY);
  }

  return (
    <div className={large ? "xy-panel surface large" : "xy-panel surface"}>
      <div className="mini-header">
        <span>LIGHTING XY</span>
        <small>moving heads</small>
      </div>
      <div
        ref={padRef}
        className="xy-pad"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPointer(event);
        }}
        onPointerMove={(event) => dragging.current && setFromPointer(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <i className="axis x" />
        <i className="axis y" />
        <span
          className="xy-dot"
          style={{ left: x * 100 + "%", top: y * 100 + "%" }}
        />
      </div>
    </div>
  );
}

function Setlist({ studio, command }: { studio: StudioState; command: CommandFn }) {
  return (
    <section className="page-screen">
      <PageTitle
        title={studio.setlist.name}
        subtitle={studio.setlist.songs.length + " songs · show order"}
      />
      <div className="setlist-list surface">
        {studio.setlist.songs.map((song, index) => (
          <button
            key={song.id}
            className={song.current ? "setlist-row current" : "setlist-row"}
            onClick={() => command("song.select", { id: song.id })}
          >
            <span className="setlist-number">{index + 1}</span>
            <div>
              <strong>{song.title}</strong>
              <small>{song.artist}</small>
            </div>
            <span>{song.bpm} BPM</span>
            <span>{song.key}</span>
            <span className={song.status === "ready" ? "ready-chip" : "warning-chip"}>
              {song.status === "ready" ? "READY" : "CHECK"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="live-badge">
        <Activity size={14} />
        LIVE
      </div>
    </div>
  );
}

function ConnectSheet({
  pairCode,
  connection,
  error,
  onPairCode,
  onConnect,
  onDemo,
  onClose
}: {
  pairCode: string;
  connection: ConnectionStatus;
  error: string | null;
  onPairCode: (value: string) => void;
  onConnect: () => void;
  onDemo: () => void;
  onClose: () => void;
}) {
  const busy = connection === "pairing" || connection === "connecting";

  return (
    <div className="connect-backdrop">
      <div className="connect-sheet surface">
        <div className="connect-icon">
          <Link2 size={24} />
        </div>
        <div className="connect-copy">
          <small>LUMARIG STUDIO</small>
          <h1>Pair Remote</h1>
          <p>
            On the Mac, open Devices → Remote Control. Enter the 6-digit code
            created by LumaRig Studio. The Mac owns the session and show state.
          </p>
        </div>

        <label>
          <span>Studio Pair Code</span>
          <input
            className="pin-input"
            value={pairCode}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            autoComplete="one-time-code"
            onChange={(event) =>
              onPairCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))
            }
          />
        </label>

        {error && <div className="connect-error">{error}</div>}

        <button
          className="connect-primary"
          onClick={onConnect}
          disabled={busy || pairCode.length !== 6}
        >
          <Wifi size={18} />
          {connection === "pairing"
            ? "Pairing…"
            : connection === "connecting"
              ? "Joining Studio…"
              : "Pair with Studio"}
        </button>

        <button className="demo-button" onClick={onDemo}>
          Open Demo Console
        </button>

        {connection === "connected" && (
          <button className="close-link" onClick={onClose}>
            Close
          </button>
        )}

        <div className="connect-foot">
          <Settings2 size={13} />
          Pairing session is created by the Mac app
        </div>
      </div>
    </div>
  );
}

type CommandFn = (
  command: RemoteCommand,
  payload?: Record<string, unknown>
) => void;

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0");
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function haptic() {
  navigator.vibrate?.(8);
}
