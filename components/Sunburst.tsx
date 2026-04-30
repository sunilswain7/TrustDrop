interface SunburstProps {
  color?: string;
  size?: number;
  rotation?: number;
  className?: string;
}

const POINTS =
  "50,0 55.7,28.8 75,6.7 65.6,34.4 93.3,25 71.2,44.3 100,50 " +
  "71.2,55.7 93.3,75 65.6,65.6 75,93.3 55.7,71.2 50,100 " +
  "44.3,71.2 25,93.3 34.4,65.6 6.7,75 28.8,55.7 0,50 " +
  "28.8,44.3 6.7,25 34.4,34.4 25,6.7 44.3,28.8";

export default function Sunburst({
  color = "var(--accent-yellow)",
  size = 80,
  rotation = 0,
  className = "",
}: SunburstProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotation}deg)`, pointerEvents: "none" }}
      className={className}
      aria-hidden="true"
    >
      <polygon
        points={POINTS}
        fill={color}
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
