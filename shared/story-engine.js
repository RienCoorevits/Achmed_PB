const ACTS = [
  'Act I. Court of Shadows',
  'Act II. The Flight Beyond the Walls',
  'Act III. Islands of Enchantment',
  'Act IV. Return Through Fire'
];

const PALETTES = [
  {
    skyTop: '#130b21',
    skyBottom: '#54306e',
    glow: '#f2c66a',
    haze: '#bb6f7a',
    ground: '#1a1017',
    silhouette: '#050206',
    text: '#f9edd2'
  },
  {
    skyTop: '#061728',
    skyBottom: '#12486a',
    glow: '#f0a44c',
    haze: '#4f7aa2',
    ground: '#0d1316',
    silhouette: '#040608',
    text: '#ebf6ff'
  },
  {
    skyTop: '#1a0d09',
    skyBottom: '#6f2f1d',
    glow: '#ffcf70',
    haze: '#d86d47',
    ground: '#170d0d',
    silhouette: '#050202',
    text: '#fff1dd'
  },
  {
    skyTop: '#051514',
    skyBottom: '#0f5d4d',
    glow: '#cde58f',
    haze: '#68b49d',
    ground: '#07100f',
    silhouette: '#020706',
    text: '#ebfff4'
  }
];

const LOCATIONS = [
  {
    name: 'opal court',
    descriptor: 'with brass lanterns drifting below the balcony arcades',
    motifs: ['palace', 'lantern', 'moon']
  },
  {
    name: 'storm sea',
    descriptor: 'as the tide folds against black lacquered rocks',
    motifs: ['waves', 'horse', 'storm']
  },
  {
    name: 'garden of sleepless birds',
    descriptor: 'while feathered shadows cut through the jasmine air',
    motifs: ['garden', 'bird', 'moon']
  },
  {
    name: 'island of Wak-Wak silhouettes',
    descriptor: 'where palm fronds and distant towers quiver in the heat',
    motifs: ['island', 'tower', 'moon']
  },
  {
    name: 'fire pass',
    descriptor: 'with sparks lifting through the red mineral wind',
    motifs: ['fire', 'horse', 'tower']
  },
  {
    name: 'vault of the sorcerer',
    descriptor: 'under a sky that feels too still to be trusted',
    motifs: ['tower', 'serpent', 'lantern']
  }
];

const FIGURES = [
  'Achmed',
  'the princess silhouette',
  'the rider on the ebony horse',
  'the magician from the market',
  'the palace courtiers'
];

const ACTIONS = [
  'leans into the wind',
  'slips between veils of smoke',
  'rides the horizon line',
  'moves as if cut from a single sheet of night',
  'holds the frame until the sky changes first'
];

const OMENS = [
  'the moon hardens into a coin of fire',
  'a hidden chorus of wings passes overhead',
  'a storm-front opens like a curtain',
  'the lamps sway without visible hands',
  'the dunes answer with mirrored shadows'
];

function hashSeed(seed) {
  const value = String(seed);
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandom(seed) {
  return mulberry32(hashSeed(seed)());
}

function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function buildScene(index, random, intensity) {
  const location = pick(random, LOCATIONS);
  const figure = pick(random, FIGURES);
  const action = pick(random, ACTIONS);
  const omen = pick(random, OMENS);
  const palette = PALETTES[index % PALETTES.length];
  const cueWords = ['drift', 'glide', 'descend', 'linger', 'surge'];
  const cue = cueWords[Math.floor(random() * cueWords.length)];
  const motifBonus = intensity > 0.66 ? ['storm', 'fire'] : ['moon', 'bird'];
  const motifs = [...new Set([...location.motifs, pick(random, motifBonus)])];

  return {
    id: `scene-${index + 1}`,
    act: ACTS[Math.min(Math.floor(index / 2), ACTS.length - 1)],
    title: `${location.name[0].toUpperCase()}${location.name.slice(1)}`,
    subtitle: `${figure} ${action}`,
    caption: `${figure} ${action} at the ${location.name}, ${location.descriptor}, while ${omen}.`,
    cue,
    palette,
    motifs
  };
}

export function createStoryState({
  seed = `${Date.now()}`,
  intensity = 0.7,
  beatDuration = 8000,
  sceneCount = 8
} = {}) {
  const random = createRandom(seed);
  const scenes = Array.from({ length: sceneCount }, (_, index) => buildScene(index, random, intensity));

  return {
    title: 'De Avonturen van Prins Achmed',
    subtitle: 'Procedural silhouette performance inspired by the 1926 film',
    seed: String(seed),
    intensity,
    beatDuration,
    isPlaying: false,
    currentIndex: 0,
    updatedAt: new Date().toISOString(),
    scenes
  };
}

export function regenerateState(previousState, overrides = {}) {
  return {
    ...createStoryState({
      seed: overrides.seed ?? previousState.seed,
      intensity: overrides.intensity ?? previousState.intensity,
      beatDuration: overrides.beatDuration ?? previousState.beatDuration,
      sceneCount: previousState.scenes.length
    }),
    isPlaying: previousState.isPlaying
  };
}

export function advanceScene(previousState, step = 1) {
  return {
    ...previousState,
    currentIndex: wrapIndex(previousState.currentIndex + step, previousState.scenes.length),
    updatedAt: new Date().toISOString()
  };
}

