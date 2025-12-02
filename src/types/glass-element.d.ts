/**
 * TypeScript declarations para glass-element Web Component
 */

declare namespace JSX {
  interface IntrinsicElements {
    "glass-element": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        width?: string;
        height?: string;
        radius?: string;
        depth?: string;
        blur?: string;
        strength?: string;
        "chromatic-aberration"?: string;
        "background-color"?: string;
        "auto-size"?: string;
        "min-width"?: string;
        "min-height"?: string;
        responsive?: string;
        "base-width"?: string;
        "base-height"?: string;
        debug?: string;
      },
      HTMLElement
    >;
  }
}

interface DisplacementUtils {
  getDisplacementMap(params: {
    height: number;
    width: number;
    radius: number;
    depth: number;
  }): string;

  getDisplacementFilter(params: {
    height: number;
    width: number;
    radius: number;
    depth: number;
    strength?: number;
    chromaticAberration?: number;
  }): string;
}

interface Window {
  DisplacementUtils: DisplacementUtils;
}

export {};
