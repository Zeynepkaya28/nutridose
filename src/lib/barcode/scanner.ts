// Browser barcode scanning. Native BarcodeDetector when it supports retail formats, otherwise @zxing/browser.
// Only the decoded barcode text is sent to the API; no camera frames leave the device.

export const RETAIL_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const;
const SCAN_INTERVAL_MS = 200;

export type ScannerEngine = "native" | "zxing";

export interface ScanControls {
  engine: ScannerEngine;
  stop(): void;
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

/** Returns the formats the native detector can read, or null if it is unavailable. */
export async function nativeFormats(scope: object = globalThis): Promise<string[] | null> {
  const Detector = (scope as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!Detector?.getSupportedFormats) return null;
  try {
    const supported = await Detector.getSupportedFormats();
    const formats = RETAIL_FORMATS.filter((format) => supported.includes(format));
    return formats.length > 0 ? formats : null;
  } catch {
    return null;
  }
}

/**
 * Scans the video until one barcode is read, then stops and calls onCode once.
 * The caller owns the camera stream (getUserMedia) and the <video> element.
 */
export async function startBarcodeScan(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
  scope: object = globalThis,
): Promise<ScanControls> {
  const formats = await nativeFormats(scope);
  if (formats) {
    const Detector = (scope as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
    const detector = new Detector({ formats });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      try {
        const [first] = await detector.detect(video);
        if (first?.rawValue && !stopped) {
          stopped = true;
          onCode(first.rawValue);
          return;
        }
      } catch {
        // Video not ready yet; try again on the next tick.
      }
      if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };
    void tick();
    return {
      engine: "native",
      stop() {
        stopped = true;
        clearTimeout(timer);
      },
    };
  }

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  let done = false;
  const controls = await reader.decodeFromVideoElement(video, (result, _error, scanControls) => {
    if (result && !done) {
      done = true;
      scanControls.stop();
      onCode(result.getText());
    }
  });
  return {
    engine: "zxing",
    stop() {
      done = true;
      controls.stop();
    },
  };
}
