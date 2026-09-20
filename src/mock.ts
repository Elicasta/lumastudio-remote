import type { SectionState, SetlistSongState, StudioState } from "./protocol";

const padColors = [
  "#fbbf24", "#60a5fa", "#f472b6", "#2dd4bf",
  "#34d399", "#8b5cf6", "#f59e0b", "#38bdf8",
  "#fb7185", "#22d3ee", "#a78bfa", "#fb923c"
];

const baseSections: SectionState[] = [
  { id: "intro", name: "Intro", startBar: 1, lengthBars: 8 },
  { id: "verse1", name: "Verse 1", startBar: 9, lengthBars: 16 },
  { id: "chorus1", name: "Chorus 1", startBar: 25, lengthBars: 16 },
  { id: "verse2", name: "Verse 2", startBar: 41, lengthBars: 16 },
  { id: "chorus2", name: "Chorus 2", startBar: 57, lengthBars: 16 },
  { id: "bridge", name: "Bridge", startBar: 73, lengthBars: 32 },
  { id: "chorus3", name: "Chorus 3", startBar: 105, lengthBars: 16 },
  { id: "outro", name: "Outro", startBar: 121, lengthBars: 8 }
];

export function sectionsForSong(songId: string): SectionState[] {
  if (songId === "goodness") return baseSections.map((section) => ({ ...section }));

  return baseSections.map((section) => ({
    ...section,
    id: songId + "-" + section.id
  }));
}

const song = (
  id: string,
  title: string,
  artist: string,
  bpm: number,
  key: string,
  durationSeconds: number,
  current = false
): SetlistSongState => ({
  id,
  title,
  artist,
  bpm,
  key,
  meter: [4, 4],
  durationSeconds,
  status: "ready",
  current
});

export const demoSetlistSongs: SetlistSongState[] = [
  song("amazing", "This Is Amazing Grace", "Phil Wickham", 98, "G", 252),
  song("goodness", "Goodness of God", "Bethel Music", 63, "Ab", 318, true),
  song("graves", "Graves Into Gardens", "Elevation Worship", 72, "C", 266),
  song("holy", "Holy Forever", "Chris Tomlin", 68, "Bb", 308),
  song("build", "Build My Life", "Housefires", 76, "C", 295),
  song("same", "Same God", "Elevation Worship", 70, "D", 258),
  song("king", "King of Kings", "Hillsong", 80, "Eb", 321),
  song("living", "Living Hope", "Phil Wickham", 72, "C", 254)
];

export const demoState: StudioState = {
  revision: 1,
  setlist: {
    id: "sunday-morning",
    name: "Sunday Morning",
    songs: demoSetlistSongs
  },
  song: {
    id: "goodness",
    title: "Goodness of God",
    artist: "Bethel Music",
    bpm: 63,
    key: "Ab",
    meter: [4, 4]
  },
  sections: sectionsForSong("goodness"),
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
    name: [
      "Warmth", "Air", "Deep", "Shimmer", "Bloom", "Motion",
      "Glass", "Soft", "Wide", "Choir", "Atmos", "Ritual"
    ][index],
    active: index === 0,
    color: padColors[index]
  })),
  mixer: [
    ["click", "Click", "#cbd5e1"],
    ["guide", "Guide", "#60a5fa"],
    ["drums", "Drums", "#22d3ee"],
    ["bass", "Bass", "#34d399"],
    ["keys", "Keys", "#facc15"],
    ["guitar", "Guitar", "#fb923c"],
    ["vocals", "Vocals", "#f472b6"],
    ["other", "Other", "#a78bfa"]
  ].map(([id, name, color], index) => ({
    id,
    name,
    gainDb: -4 + index * 0.35,
    muted: false,
    solo: false,
    meter: [0.22, 0.18, 0.72, 0.51, 0.43, 0.38, 0.61, 0.29][index],
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
  health: {
    audio: true,
    midi: false,
    lighting: false,
    remote: true
  }
};
