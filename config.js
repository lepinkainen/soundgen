export const WAVEFORMS = ["sawtooth", "square", "triangle"];

export const progressions = {
  "I-V-vi-IV": [
    // C-G-Am-F
    { name: "C", chord: [60, 64, 67], bass: 48 },
    { name: "G", chord: [55, 59, 62], bass: 43 },
    { name: "Am", chord: [57, 60, 64], bass: 45 },
    { name: "F", chord: [53, 57, 60], bass: 41 },
  ],
  "vi-IV-I-V": [
    // Am-F-C-G (The "Axis of Awesome" progression)
    { name: "Am", chord: [57, 60, 64], bass: 45 },
    { name: "F", chord: [53, 57, 60], bass: 41 },
    { name: "C", chord: [60, 64, 67], bass: 48 },
    { name: "G", chord: [55, 59, 62], bass: 43 },
  ],
  "i-VII-VI-V": [
    // Am-G-F-E
    { name: "Am", chord: [57, 60, 64], bass: 45 },
    { name: "G", chord: [55, 59, 62], bass: 43 },
    { name: "F", chord: [53, 57, 60], bass: 41 },
    { name: "E", chord: [52, 56, 59], bass: 40 },
  ],
  "i-VI-III-VII": [
    // Am-F-C-G, but thinking in minor key
    { name: "Am", chord: [57, 60, 64], bass: 45 },
    { name: "F", chord: [53, 57, 60], bass: 41 },
    { name: "C", chord: [60, 64, 67], bass: 48 },
    { name: "G", chord: [55, 59, 62], bass: 43 },
  ],
};

export const drumPatterns = [
  {
    name: "Four on the Floor",
    kick: [0],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    name: "Classic 80s",
    kick: [0, 8],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    name: "Syncopated Kick",
    kick: [0, 7, 8],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    name: "Breakbeat-ish",
    kick: [0, 6, 10],
    snare: [4, 12],
    hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
];

export const keyScale = [57, 59, 60, 62, 64, 65, 67, 69, 71];
export const STEPS_PER_BAR = 16;
