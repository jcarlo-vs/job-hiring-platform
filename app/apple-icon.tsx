import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon.
 *
 * Generated rather than shipped as a file because the apple-icon convention
 * only accepts .jpg/.png, and hand-exporting a PNG from the SVG would mean two
 * copies of the mark drifting apart. This renders from the same shape.
 *
 * Deliberately on a solid teal ground with no transparency: iOS does not round
 * transparent corners, it fills them black. It also applies its own corner
 * radius, so the square here is left un-rounded.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e7c7b",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 120,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        T
      </div>
    </div>,
    { ...size },
  );
}
