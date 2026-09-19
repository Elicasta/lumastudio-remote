import type { StudioState } from "./protocol";

const padColors = [
  "#fbbf24", "#60a5fa", "#f472b6", "#2dd4bf",
  "#34d399", "#8b5cf6", "#f59e0b", "#38bdf8",
  "#fb7185", "#22d3ee", "#a78bfa", "#fb923c"
];

export const demoState: StudioState = {
  revision: 1,
  setlistName: "Sunday Morning",
  song: {
    id: "goodness",
    title: "Goodness of God",
    artist: "Bethel Music",
    bpm: 63,
    key: "Ab",
    meter: [4, 4]
  },
  sections: [
    { id: "intro", name: "Intro", startBar: 1, lengthBars: 8 },
    { id: "verse-1", name: "Verse 1", startBar: 9, lengthBars: 16 },
    { id: "chorus-1", name: "Chorus 1", startBar: 25, lengthBars: 16 },
    { id: "verse-2", name: "Verse 2", startBar: 41, lengthBars: 16 },
    { id: "chorus-2", name: "Chorus 2", startBar: 57, lengthBars: 16 },
    { id: "bridge", name: "Bridge", startBar: 73, lengthBars: 32 },
    { id: "chorus-3", name: "Chorus 3", startBar: 105, lengthBars: 16 },
    { id: "outro", name: "Outro", startBar: 121, lengthBars: 8 }
  ],
  currentSectionIndex: 4,
  queuedSectionIndex: 5,
  transport: {
    playing: true,
    positionSeconds: 194,
    durationSeconds: 318,
    bar: 61,
    beat: 3
  },
  pads: Array.from({ length: 12 }, (_, index) => ({
    id: "pad-" + (index + 1),
    name: ["Warm", "Air", "Deep", "Light", "Sub", "Piano", "Texture", "Rise", "Soft", "Wide", "Motion", "Custom"][index],
    active: index === 0,
    color: padColors[index]
  })),
  mixer: [
    ["music", "Music", "#f472b6"],
    ["pads", "Pads", "#8b5cf6"],
    ["click", "Click", "#cbd5e1"],
    ["guide", "Guide", "#60a5fa"],
    ["lighting", "Lighting", "#f59e0b"],
    ["master", "Master", "#34d399"]
  ].map(([id, name, color], index) => ({
    id,
    name,
    gainDb: index === 5 ? -1.5 : -4 + index * 0.5,
    muted: false,
    solo: false,
    meter: [0.72, 0.35, 0.53, 0.28, 0.46, 0.8][index],
    color
  })),
  lighting: {
    blackout: false,
    x: 0.5,
    y: 0.62,
    scenes: [
      { id: "clean", name: "Clean", color: "#60a5fa", active: false },
      { id: "verse", name: "Verse", color: "#34d399", active: false },
      { id: "chorus", name: "Chorus", color: "#f472b6", active: true },
      { id: "bridge", name: "Bridge", color: "#a78bfa", active: false }
    ]
  },
  setlist: [
    ["amazing", "This Is Amazing Grace", "Phil Wickham", 98, "G"],
    ["goodness", "Goodness of God", "Bethel Music", 63, "Ab"],
    ["graves", "Graves Into Gardens", "Elevation Worship", 72, "C"],
    ["holy", "Holy Forever", "Chris Tomlin", 68, "Bb"],
    ["build", "Build My Life", "Housefires", 76, "C"]
  ].map(([id, title, artist, bpm, key], index) => ({
    id: String(id),
    title: String(title),
    artist: String(artist),
    bpm: Number(bpm),
    key: String(key),
    ready: true,
    current: index === 1
  })),
  health: {
    audio: true,
    midi: true,
    lighting: true,
    remote: true
  }
};
