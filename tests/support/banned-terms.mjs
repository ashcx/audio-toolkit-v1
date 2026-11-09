/**
 * The words the interface must never show, shared by the copy catalogue test and the browser state scan.
 * A pattern is checked against text after the ALLOWED phrases are removed.
 */
export const BANNED = [
  /\bGPU\b/i, /\bCPU\b/i, /\bcodecs?\b/i, /\bstream\b/i, /\bcleanup\b/i, /\btemporary\b/i, /\bidentity\b/i,
  /\bbackpressure\b/i, /\bisolation\b/i, /re-encoding/i, /Failed to fetch/i, /Error:/, /\bmodel\b/i, /\bwindow\b/i,
  /\bDemucs\b/i, /\bGTCRN\b/i, /\bDeepFilterNet/i, /\bLAME\b/, /AAC encoder/i,
];
/**
 * The deck allows these exact phrases. The download label and its errors name "the voice/music model",
 * "Keep original (no re-encoding)" is the decided export name, and "a normal window" is a browser window.
 */
export const ALLOWED = [/voice\/music model/g, /Downloading model/g, /The model download was damaged/g, /no re-encoding/g, /a normal window/g];
export const visible = text => ALLOWED.reduce((rest, pattern) => rest.replace(pattern, ''), text);
/** The patterns a piece of visible text matches, as source strings. Empty when the text is clean. */
export const bannedIn = text => BANNED.filter(pattern => pattern.test(visible(text))).map(String);
