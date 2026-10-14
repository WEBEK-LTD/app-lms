import { encodeQr, qrSvgPath } from "@/lib/qr";

/** A QR code drawn on the server (lib/qr.ts): no outside service is asked to make it. */
export function QrCode({ value, label, size = 152 }: { value: string; label: string; size?: number }) {
  const { path, side } = qrSvgPath(encodeQr(value));
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      shapeRendering="crispEdges"
      className="block flex-none rounded-lg bg-white"
      data-qr={value}
    >
      <rect width={side} height={side} fill="#FFFFFF" />
      <path d={path} fill="#0E0D24" />
    </svg>
  );
}
