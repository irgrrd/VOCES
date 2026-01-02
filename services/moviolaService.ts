
import { MoviolaInput, EditScriptMaster, TimelineClip, EnginePacket, AspectRatio } from '../types/moviola';

export class MoviolaService {
  /**
   * Genera un hash determinista (DJB2) del input canonicalizado.
   * Ordena las claves del objeto para asegurar consistencia.
   */
  public static async hashInput(input: MoviolaInput): Promise<string> {
    const canonical = JSON.stringify({
      context: input.analysisContext,
      prompt: input.compiledVisualPrompt,
      settings: {
          ratio: input.revealSettings.aspectRatio,
          style: input.revealSettings.filmStyle,
          lens: input.revealSettings.lens
      }
    }, Object.keys).replace(/\s+/g, '');
    
    let hash = 5381;
    for (let i = 0; i < canonical.length; i++) {
      hash = ((hash << 5) + hash) + canonical.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Segmenta la narrativa en clips usando heurística de ritmo (aprox 2.5 palabras/seg).
   * Ajusta la duración total para cuadrar con el input.
   */
  private static segmentNarrative(text: string, totalSec: number): Array<{ text: string; duration: number }> {
     // 1. Limpieza y división por oraciones fuertes
     const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
     
     if (sentences.length === 0) {
         return [{ text: text.substring(0, 150) || "Establishing scene", duration: totalSec }];
     }

     // 2. Cálculo de clips ideales (3-6s)
     const minClipDur = 3;
     const maxClipDur = 6;
     
     // Si hay muchas oraciones, agrupar o seleccionar las más relevantes sería ideal,
     // pero para v5.0 hacemos un mapping directo limitado por la duración total.
     const maxPossibleClips = Math.floor(totalSec / minClipDur);
     const clipsToUse = Math.min(sentences.length, maxPossibleClips) || 1;
     
     const baseDuration = Math.floor(totalSec / clipsToUse);
     const remainder = totalSec % clipsToUse;

     const segments = [];
     for(let i = 0; i < clipsToUse; i++) {
        const extra = (i === clipsToUse - 1) ? remainder : 0;
        segments.push({ 
            text: sentences[i].trim(), 
            duration: baseDuration + extra
        });
     }
     return segments;
  }

  /**
   * Adapta el prompt base para motores específicos usando SOLO TEXTO (Anti-alucinación).
   */
  private static optimizeForEngine(basePrompt: string, engine: string, ratio: AspectRatio): string {
    const e = engine.toLowerCase();
    let suffix = "";

    if (e.includes("veo")) {
        suffix = ", cinematic camera movement, smooth motion, coherent scene, HDR, high fidelity, 24fps look";
    } else if (e.includes("sora")) {
        suffix = ", physics-consistent, detailed material behavior, natural dynamics, complex interactions, photorealistic";
    } else if (e.includes("wan")) {
        suffix = ", movement-forward, dynamic cameraMove emphasized, strong contrast, dramatic lighting";
    } else {
        suffix = ", high quality video, 4k";
    }

    // Traducir ratio a palabras clave visuales
    if (ratio === "21:9") suffix += ", ultrawide anamorphic format, movie bars";
    if (ratio === "9:16") suffix += ", vertical video composition, social media frame";
    if (ratio === "1:1") suffix += ", square composition, album cover style";

    return `${basePrompt}${suffix}`;
  }

  public static async compileMasterScript(input: MoviolaInput): Promise<EditScriptMaster> {
    const hash = await this.hashInput(input);
    const segments = this.segmentNarrative(input.narrativeText, input.moviola.durationSec);
    
    // Base Prompt Construction
    const rs = input.revealSettings;
    const coreVisuals = input.compiledVisualPrompt 
        ? input.compiledVisualPrompt.replace(/\n/g, " ") 
        : `Shot on ${rs.lens}, ${rs.lighting}, ${rs.filmStyle}`;
    
    // Notas de composición
    const wmNote = rs.watermark.enabled 
        ? ` [Note: Leave negative space at ${rs.watermark.position} for watermark]` 
        : "";
    
    const refNote = rs.referenceWeight > 0 
        ? ` [Note: Adhere to reference structure at ${rs.referenceWeight}%]` 
        : "";

    const timeline: TimelineClip[] = segments.map((seg, idx) => ({
      id: `clip_${idx + 1}`,
      timecode: { 
          in: `00:0${idx * Math.floor(input.moviola.durationSec / segments.length)}`, // Approx timestamp
          out: `00:0${(idx + 1) * Math.floor(input.moviola.durationSec / segments.length)}`,
          durationSec: seg.duration 
      },
      visuals: { 
        shotType: idx === 0 ? "Wide Establishing Shot" : (idx % 2 === 0 ? "Medium Shot" : "Close Up"), 
        cameraMove: idx === 0 ? "Slow Pan" : "Tracking Shot", 
        description: seg.text,
        focus: rs.fidelity === "LOCK_A" ? "Sharp Focus on Subject" : "Soft Focus"
      },
      audio: { 
        voiceover: seg.text,
        sfx: "Ambience match",
        music: "Subtle underscore" 
      },
      // Prompt Base Agnóstico
      genPromptBase: `Action: ${seg.text}. Visuals: ${coreVisuals}.${wmNote}${refNote} Intent: ${input.moviola.intent}.`
    }));

    // Engine Packet Generation
    const isVertical = ["9:16", "4:5"].includes(rs.aspectRatio);
    const engineLower = input.moviola.engine.toLowerCase();
    
    const packet: EnginePacket = {
      engine: input.moviola.engine,
      status: "READY",
      optimizedPrompts: timeline.map(c => ({
        clipId: c.id,
        prompt: this.optimizeForEngine(c.genPromptBase, input.moviola.engine, rs.aspectRatio)
      })),
      compatibilityNotes: {
        ratioSupported: true, // Asumimos true por defecto
        notes: (engineLower.includes("veo") && isVertical) 
            ? "WARNING: Veo native models perform best in 16:9. Vertical crop may lose essential details." 
            : "Optimal configuration."
      }
    };

    return {
      meta: {
        traceId: input.traceId,
        inputSnapshotHash: hash,
        createdAt: Date.now(),
        formatRatio: rs.aspectRatio,
        totalDurationSec: input.moviola.durationSec,
        intent: input.moviola.intent
      },
      rules: { 
        language: "es-MX", 
        negativesGlobal: rs.negativePrompt || "blur, text, watermark, distortion, bad anatomy", 
        constraints: ["Maintain character consistency", "No abrupt cuts"] 
      },
      timeline,
      enginePackets: [packet]
    };
  }
}
