import type {
  RekordboxLibrary,
  RekordboxPlaylist,
  RekordboxTrack,
} from "@/types/rekordbox";

/**
 * Parser do arquivo rekordbox.xml (formato DJ_PLAYLISTS v1.0).
 *
 * Estrutura relevante:
 *   DJ_PLAYLISTS
 *     COLLECTION > TRACK (atributos: TrackID, Name, Artist, AverageBpm,
 *                         Tonality, TotalTime; filhos: POSITION_MARK)
 *     PLAYLISTS  > NODE (Type="0" = pasta, Type="1" = playlist)
 *                   playlists contêm TRACK com atributo Key = TrackID
 *
 * Hot cues são POSITION_MARK com Num >= 0 (Num="0" = A, Num="1" = B).
 * Memory cues têm Num="-1" e são ignorados.
 */
export function parseRekordboxXml(xml: string): RekordboxLibrary {
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("O arquivo rekordbox.xml está corrompido ou em formato inválido.");
  }

  const root = doc.querySelector("DJ_PLAYLISTS");
  if (!root) {
    throw new Error("O arquivo não parece ser um XML exportado do Rekordbox.");
  }

  return {
    tracks: parseCollection(root),
    playlists: parsePlaylists(root),
  };
}

function parseCollection(root: Element): Map<string, RekordboxTrack> {
  const tracks = new Map<string, RekordboxTrack>();
  const trackElements = root.querySelectorAll(":scope > COLLECTION > TRACK");

  for (const el of trackElements) {
    const id = el.getAttribute("TrackID");
    if (!id) continue;

    const { hotCueASeconds, hotCueBSeconds } = parseHotCues(el);

    tracks.set(id, {
      id,
      title: el.getAttribute("Name") ?? "(sem título)",
      artist: el.getAttribute("Artist") ?? "",
      bpm: parseOptionalNumber(el.getAttribute("AverageBpm")),
      key: emptyToNull(el.getAttribute("Tonality")),
      totalTimeSeconds: parseOptionalNumber(el.getAttribute("TotalTime")) ?? 0,
      hotCueASeconds,
      hotCueBSeconds,
    });
  }

  return tracks;
}

function parseHotCues(trackEl: Element): {
  hotCueASeconds: number | null;
  hotCueBSeconds: number | null;
} {
  let hotCueASeconds: number | null = null;
  let hotCueBSeconds: number | null = null;

  for (const mark of trackEl.querySelectorAll(":scope > POSITION_MARK")) {
    const num = mark.getAttribute("Num");
    const start = parseOptionalNumber(mark.getAttribute("Start"));
    if (start === null) continue;

    if (num === "0") hotCueASeconds = start;
    else if (num === "1") hotCueBSeconds = start;
  }

  return { hotCueASeconds, hotCueBSeconds };
}

function parsePlaylists(root: Element): RekordboxPlaylist[] {
  const playlists: RekordboxPlaylist[] = [];
  const rootNode = root.querySelector(":scope > PLAYLISTS > NODE");
  if (!rootNode) return playlists;

  let sequence = 0;

  const walk = (node: Element, folderPath: string[]): void => {
    for (const child of node.querySelectorAll(":scope > NODE")) {
      const name = child.getAttribute("Name") ?? "(sem nome)";
      const type = child.getAttribute("Type");

      if (type === "1") {
        const trackIds: string[] = [];
        // A ordem dos elementos TRACK no XML é a ordem da playlist no Rekordbox.
        for (const trackRef of child.querySelectorAll(":scope > TRACK")) {
          const key = trackRef.getAttribute("Key");
          if (key) trackIds.push(key);
        }
        playlists.push({
          id: `pl-${sequence++}`,
          name,
          folderPath,
          trackIds,
        });
      } else {
        walk(child, [...folderPath, name]);
      }
    }
  };

  walk(rootNode, []);
  return playlists;
}

function parseOptionalNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyToNull(value: string | null): string | null {
  return value && value.trim() !== "" ? value : null;
}
