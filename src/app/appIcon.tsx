// App icon artwork shared by the favicon, Apple touch icon and PWA icons. A simple capsule mark;
// no Apple artwork or SF Symbols are used.
export function AppIconArt({ size }: { size: number }) {
  const capsuleWidth = size * 0.56;
  const capsuleHeight = size * 0.24;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #34c759 0%, #00c3d0 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: capsuleWidth,
          height: capsuleHeight,
          borderRadius: capsuleHeight,
          overflow: "hidden",
          transform: "rotate(-35deg)",
          boxShadow: `0 ${size * 0.02}px ${size * 0.05}px rgba(0,0,0,0.18)`,
        }}
      >
        <div style={{ flex: 1, background: "#ffffff" }} />
        <div style={{ flex: 1, background: "rgba(255,255,255,0.55)" }} />
      </div>
    </div>
  );
}
