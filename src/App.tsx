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
import { RemoteClient, type ConnectionStatus } from "./remoteClient";
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
  const [serverUrl, setServerUrl] = useState(
    localStorage.getItem("lumarig.remote.url") ??
      "ws://lumarig-studio.local:7070/remote"
  );
  const [pin, setPin] = useState(localStorage.getItem("lumarig.remote.pin") ?? "");
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

  function connect() {
    clientRef.current?.disconnect();
    setError(null);
    localStorage.setItem("lumarig.remote.url", serverUrl);
    localStorage.setItem("lumarig.remote.pin", pin);

    const client = new RemoteClient(serverUrl, pin, {
      onStatus: setConnection,
      onState: (studio) => {
        setDemoMode(false);
        dispatch({ type: "studio", state: studio });
        setConnectOpen(false);
      },
      onError: setError
    });

    clientRef.current = client;
    client.connect();
  }

  function demo() {
    clientRef.current?.disconnect();
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
          serverUrl={serverUrl}
          pin={pin}
          connection={connection}
          error={error}
          onUrl={setServerUrl}
          onPin={setPin}
          onConnect={connect}
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

  return (
    <section className="performance-screen">
      <div className="section-strip">
        {studio.sections.map((section, index) => (
          <button
            key={section.id}
            className={
              index === studio.currentSectionIndex
                ? "section-chip current"
                : index === studio.queuedSectionIndex
                  ? "section-chip queued"
                  : "section-chip"
            }
            onClick={() => command("section.launch", { id: section.id })}
          >
            <small>{section.startBar}</small>
            <strong>{section.name}</strong>
            <span>{section.lengthBars} bars</span>
          </button>
        ))}
      </div>

      <div className="performance-grid">
        <div className="current-card surface">
          <div className="eyebrow">CURRENT SECTION</div>
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
          <div className="eyebrow">UP NEXT</div>
          <h2>{nextSection.name}</h2>
          <p>{nextSection.lengthBars} bars</p>
          <button
            className="queue-button"
            onClick={() => command("section.launch", { id: nextSection.id })}
          >
            Launch Now
          </button>
        </div>

        <div className="system-card surface">
          <div className="eyebrow">SHOW STATUS</div>
          <StatusRow label="Audio Engine" ok={studio.health.audio} />
          <StatusRow label="MIDI Clock" ok={studio.health.midi} />
          <StatusRow label="LumaRig Lighting" ok={studio.health.lighting} />
          <StatusRow label="Remote Link" ok={studio.health.remote} />
        </div>
      </div>

      <div className="transport-console">
        <button className="transport-key" onClick={() => command("transport.previous")}>
          <ChevronLeft size={24} />
          <span>PREV</span>
        </button>

        <button className="transport-key stop" onClick={() => command("transport.stop")}>
          <CircleStop size={23} />
          <span>STOP</span>
        </button>

        <button className="go-button" onClick={() => command("transport.go")}>
          GO
        </button>

        <button
          className="transport-key"
          onClick={() =>
            command(studio.transport.playing ? "transport.pause" : "transport.play")
          }
        >
          {studio.transport.playing ? <Pause size={23} /> : <Play size={23} />}
          <span>{studio.transport.playing ? "PAUSE" : "PLAY"}</span>
        </button>

        <button className="transport-key" onClick={() => command("transport.next")}>
          <ChevronRight size={24} />
          <span>NEXT</span>
        </button>
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
      <PageTitle title={studio.setlistName} subtitle={studio.setlist.length + " songs · show order"} />
      <div className="setlist-list surface">
        {studio.setlist.map((song, index) => (
          <button
            key={song.id}
            className={song.current ? "setlist-row current" : "setlist-row"}
            onClick={() => command("setlist.song", { id: song.id })}
          >
            <span className="setlist-number">{index + 1}</span>
            <div>
              <strong>{song.title}</strong>
              <small>{song.artist}</small>
            </div>
            <span>{song.bpm} BPM</span>
            <span>{song.key}</span>
            <span className={song.ready ? "ready-chip" : "warning-chip"}>
              {song.ready ? "READY" : "CHECK"}
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
  serverUrl,
  pin,
  connection,
  error,
  onUrl,
  onPin,
  onConnect,
  onDemo,
  onClose
}: {
  serverUrl: string;
  pin: string;
  connection: ConnectionStatus;
  error: string | null;
  onUrl: (value: string) => void;
  onPin: (value: string) => void;
  onConnect: () => void;
  onDemo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="connect-backdrop">
      <div className="connect-sheet surface">
        <div className="connect-icon">
          <Link2 size={24} />
        </div>
        <div className="connect-copy">
          <small>LUMARIG STUDIO</small>
          <h1>Connect Remote</h1>
          <p>
            Put the iPad or iPhone on the same network as the Studio Mac, then
            connect to its Remote endpoint.
          </p>
        </div>

        <label>
          <span>Studio address</span>
          <input
            value={serverUrl}
            onChange={(event) => onUrl(event.currentTarget.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <label>
          <span>Pairing PIN</span>
          <input
            className="pin-input"
            value={pin}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            onChange={(event) =>
              onPin(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))
            }
          />
        </label>

        {error && <div className="connect-error">{error}</div>}

        <button
          className="connect-primary"
          onClick={onConnect}
          disabled={connection === "connecting"}
        >
          <Wifi size={18} />
          {connection === "connecting" ? "Connecting…" : "Connect to Studio"}
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
          Saved only on this device
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
