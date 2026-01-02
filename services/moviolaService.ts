// services/moviolaService.ts
import type {
  MoviolaInput,
  EditScriptMaster,
  TimelineClip,
  AspectRatio,
  EnginePacket,
  ShotType,
} from "../types/moviola";

// -----------------------------
// Canonicalize + Hash (trazabilidad)
// -----------------------------

const stableSortObject = (value: any): any => {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        out[k] = stableSortObject(value[k]);
      });
    return out;
  }
  return value;
};

const utf8 = (s: string) => new TextEncoder().encode(s);

const bytesToHex = (bytes: ArrayBuffer) => {
  const arr = new Uint8Array(bytes);
  let hex = "";
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
  return hex;
};

// Fallback hash (NO criptográfico) si no hay crypto.subtle
const weakHash = (s: string) => {
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
};

const formatTime = (sec: number) => {
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

// -----------------------------
// Segmentación narrativa (3–6s)
// -----------------------------
// Heurística: 2.5 palabras/sec.
// - clips de 3 a 6 seg
// - intentamos cubrir totalDurationSec +/- 1
const segmentNarrative = (text: string, targetTotalSec: number) => {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  const words = clean ? clean.split(" ") : [];
  const wordsPerSec = 2.5;

  const minSec = 3;
  const maxSec = 6;

  // Si no hay texto, igual generamos 1 segmento neutro
  if (words.length === 0) {
    const dur = clamp(targetTotalSec || 6, minSec, maxSec);
    return [{ segmentText: "", durationSec: dur }];
  }

  // Queremos una cantidad aproximada de clips según target
  const approxClips = Math.max(1, Math.round((targetTotalSec || 12) / 4));
  const wordsPerClip = Math.max(8, Math.round(words.length / approxClips));

  const segments: Array<{ segmentText: string; durationSec: number }> = [];
  let i = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + wordsPerClip);
    const segText = slice.join(" ");
    let dur = Math.round(slice.length / wordsPerSec);
    dur = clamp(dur, minSec, maxSec);
    segments.push({ segmentText: segText, durationSec: dur });
    i += wordsPerClip;
  }

  // Ajuste para acercarnos a targetTotalSec
  const target = Math.max(minSec, targetTotalSec || 12);
  let sum = segments.reduce((a, s) => a + s.durationSec, 0);

  // Ajuste fino (sin romper límites)
  // Si sum es muy alto, reducimos 1s en clips donde podamos
  while (sum > target + 1) {
    let changed = false;
    for (const s of segments) {
      if (s.durationSec > minSec) {
        s.durationSec -= 1;
        sum -= 1;
        changed = true;
        if (sum <= target + 1) break;
      }
    }
    if (!changed) break;
  }

  // Si sum es muy bajo, sumamos 1s en clips donde podamos
  while (sum < target - 1) {
    let changed = false;
    for (const s of segments) {
      if (s.durationSec < maxSec) {
        s.durationSec += 1;
        sum += 1;
        changed = true;
        if (sum >= target - 1) break;
      }
    }
    if (!changed) break;
  }

  return segments;
};

// -----------------------------
// Helpers: traducciones a texto técnico
// -----------------------------
const ratioToText = (ar: AspectRatio) => `Target aspect ratio: ${ar}.`;

const watermarkToText = (wm: MoviolaInput["revealSettings"]["watermark"]) => {
  if (!wm?.enabled || !wm.text?.trim()) return "";
  const pos =
    wm.position === "top_left"
      ? "top-left"
      : wm.position === "top_right"
        ? "top-right"
        : wm.position === "bottom_left"
          ? "bottom-left"
          : wm.position === "bottom_right"
            ? "bottom-right"
            : "center";
  const op = clamp(Math.round(wm.opacity), 0, 100);
  // Importante: esto es solo instrucción textual, no promesa de pixel-perfect
  return `Composition note: include a subtle watermark text "${wm.text.trim()}" at ${pos}, approx ${op}% opacity (best-effort, may vary).`;
};

const fidelityToText = (f: MoviolaInput["revealSettings"]["fidelity"]) => {
  if (f === "LOCK_A") return "Identity fidelity: digital-twin level (preserve facial/body identity if applicable).";
  if (f === "LOCK_B") return "Narrative fidelity: consistent character + story coherence.";
  return "Atmosphere fidelity: prioritize mood, lighting, palette, and scene feeling.";
};

const weightToText = (w: number) => {
  const n = clamp(Math.round(w), 0, 100);
  if (n >= 80) return "Reference influence: very strong (minimal deviation).";
  if (n <= 20) return "Reference influence: loose (inspiration only).";
  return "Reference influence: balanced (mix prompt + reference).";
};

const pickShotType = (idx: number): ShotType => {
  // simple pattern: establish -> medium -> close -> macro -> medium ...
  const mod = idx % 5;
  if (mod === 0) return "Wide";
  if (mod === 1) return "Medium";
  if (mod === 2) return "CloseUp";
  if (mod === 3) return "Macro";
  return "Medium";
};

const defaultCameraMove = (idx: number) => {
  const mod = idx % 4;
  if (mod === 0) return "Slow push-in";
  if (mod === 1) return "Slow pan right";
  if (mod === 2) return "Handheld subtle drift";
  return "Static tripod";
};

// -----------------------------
// MoviolaService (guion técnico)
// -----------------------------
export const moviolaService = {
  async hashInput(input: MoviolaInput): Promise<string> {
    const canonical = JSON.stringify(stableSortObject(input));
    try {
      const cryptoObj: Crypto | undefined = (globalThis as any).crypto;
      if (cryptoObj?.subtle?.digest) {
        const digest = await cryptoObj.subtle.digest("SHA-256", utf8(canonical));
        return bytesToHex(digest);
      }
      return weakHash(canonical);
    } catch {
      return weakHash(canonical);
    }
  },

  segmentNarrative,

  async compileMasterScript(input: MoviolaInput): Promise<EditScriptMaster> {
    const total = clamp(Math.round(input.moviola.durationSec || 12), 3, 180);
    const createdAt = Date.now();
    const inputSnapshotHash = await this.hashInput(input);

    const constraints: string[] = [
      "Moviola does NOT generate video; it generates technical scripts (JSON).",
      "Engine adaptation is prompt-text only (no API parameters assumed).",
      "Watermark is best-effort instruction + metadata, not pixel-guaranteed.",
    ];

    // Compact cultural context
    const culture =
      input.culturalElements && input.culturalElements.length
        ? `Cultural context (Guerrero, Mexico): ${input.culturalElements.join(", ")}.`
        : "";

    const segs = segmentNarrative(input.narrativeText, total);

    // Base technical string (English)
    const techBase = [
      `Lens: ${input.revealSettings.lens}.`,
      `Lighting: ${input.revealSettings.lighting}.`,
      `Film style: ${input.revealSettings.filmStyle}.`,
      ratioToText(input.revealSettings.aspectRatio),
      fidelityToText(input.revealSettings.fidelity),
      weightToText(input.revealSettings.referenceWeight),
      input.revealSettings.templatePreset && input.revealSettings.templatePreset !== "none"
        ? `Usage template: ${input.revealSettings.templatePreset}.`
        : "",
      watermarkToText(input.revealSettings.watermark),
      input.revealSettings.manualOverride?.trim()
        ? `Manual override: ${input.revealSettings.manualOverride.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const negative = input.revealSettings.negativePrompt?.trim()
      ? `Exclude: ${input.revealSettings.negativePrompt.trim()}.`
      : "";

    const timeline: TimelineClip[] = [];
    let cursor = 0;

    for (let i = 0; i < segs.length; i++) {
      const dur = segs[i].durationSec;
      const tcIn = formatTime(cursor);
      const tcOut = formatTime(cursor + dur);

      const shotType = pickShotType(i);
      const camMove = defaultCameraMove(i);

      const segmentText = segs[i].segmentText?.trim();
      const segmentAction = segmentText
        ? `Visualize this narrative beat: ${segmentText}`
        : "Visualize an establishing beat consistent with the narrative and scene.";

      // Clip prompt base (English)
      const genPromptBase = [
        "High-quality video prompt (script-level, no rendering here).",
        `Scene summary: ${input.analysisContext}.`,
        culture,
        `Clip intent: ${input.moviola.intent}.`,
        `Shot type: ${shotType}. Camera move: ${camMove}.`,
        segmentAction,
        techBase,
        negative,
      ]
        .filter(Boolean)
        .join(" ");

      timeline.push({
        id: `clip_${String(i + 1).padStart(2, "0")}`,
        timecode: { in: tcIn, out: tcOut, durationSec: dur },
        visuals: {
          shotType,
          cameraMove: camMove,
          description: segmentText ? segmentText.slice(0, 380) : "Establishing shot aligned with the story.",
          focus: shotType === "Macro" ? "Shallow focus on details" : "Natural focus",
        },
        audio: {
          voiceover: undefined, // la voz en off se puede derivar si lo decides después
          sfx: "Ambient sound consistent with scene (market, wind, footsteps), subtle.",
          music: "Optional: minimal ambient bed, avoid overpowering narration.",
        },
        genPromptBase,
      });

      cursor += dur;
      if (cursor >= total) break;
    }

    // Ajuste de totalDurationSec real
    const actualTotal = timeline.reduce((a, c) => a + c.timecode.durationSec, 0);

    const master: EditScriptMaster = {
      meta: {
        traceId: input.traceId,
        inputSnapshotHash,
        createdAt,
        formatRatio: input.revealSettings.aspectRatio,
        totalDurationSec: actualTotal,
        intent: input.moviola.intent,
      },
      rules: {
        language: "es-MX",
        negativesGlobal: input.revealSettings.negativePrompt || "",
        constraints,
      },
      timeline,
      enginePackets: [],
    };

    // Engine packets (motor destino)
    master.enginePackets = [this.generateEnginePackets(master, input.moviola.engine)];

    return master;
  },

  generateEnginePackets(master: EditScriptMaster, engine: string): EnginePacket {
    const eng = (engine || "Otro").trim();
    const ratio = master.meta.formatRatio;

    const baseNotes: EnginePacket["compatibilityNotes"] = {};
    let status: EnginePacket["status"] = "READY";

    // Heurística de compatibilidad vertical: marcamos WARNING en algunos motores (sin inventar)
    const isVertical = ratio === "9:16" || ratio === "3:4" || ratio === "4:5";
    if (isVertical && /veo/i.test(eng)) {
      status = "WARNING";
      baseNotes.ratioSupported = false;
      baseNotes.notes =
        "Vertical ratio may be limited depending on the Veo version/config. Keep prompts short and test.";
    }

    const optimizedPrompts = master.timeline.map((clip) => {
      const base = clip.genPromptBase;

      let styleAddon = "High quality video.";
      if (/veo/i.test(eng)) {
        styleAddon =
          "Cinematic camera movement, smooth motion, coherent scene continuity, HDR-like contrast, stable details.";
      } else if (/sora/i.test(eng)) {
        styleAddon =
          "Physics-consistent motion, detailed material behavior, natural dynamics, realistic lighting transport.";
      } else if (/wan/i.test(eng)) {
        styleAddon =
          "Movement-forward: emphasize cameraMove and subject motion, dynamic but controlled, keep coherence.";
      } else if (/grok/i.test(eng)) {
        styleAddon =
          "Experimental generation: keep prompt structured, prioritize clarity, avoid overly long constraints.";
      }

      const prompt = `${base} Engine optimization: ${styleAddon}`;
      return { clipId: clip.id, prompt };
    });

    return {
      engine: eng,
      status,
      optimizedPrompts,
      compatibilityNotes: Object.keys(baseNotes).length ? baseNotes : undefined,
    };
  },
};
