// 치이카와 풍 임시 캐릭터. 공개 발표 전에는 오리지널 캐릭터로 교체할 것 (이 파일만 바꾸면 된다).
// 이동·점프 등 연출은 demo/index.html 의 .char 애니메이션을 옮겨올 예정.

export type Pose = "idle" | "sniff" | "alert" | "happy" | "fix";

const INK = "#2b2b2b";

export default function Character({ pose = "idle", className }: { pose?: Pose; className?: string }) {
  const eyes = pose === "happy" ? "happy" : pose === "alert" ? "x" : "open";
  return (
    <svg viewBox="0 0 48 46" className={className} style={{ overflow: "visible" }} aria-hidden>
      <g stroke={INK} strokeWidth={1.6} fill="#fff">
        <ellipse cx={13} cy={10} rx={5} ry={5.5} />
        <ellipse cx={35} cy={10} rx={5} ry={5.5} />
        <ellipse cx={17} cy={42} rx={4.5} ry={2.6} />
        <ellipse cx={31} cy={42} rx={4.5} ry={2.6} />
        <path d="M24 6c13 0 20 9 20 19 0 11-8 16-20 16S4 36 4 25C4 15 11 6 24 6Z" />
      </g>
      <ellipse cx={11.5} cy={29} rx={3.4} ry={1.9} fill="#ffb7c5" />
      <ellipse cx={36.5} cy={29} rx={3.4} ry={1.9} fill="#ffb7c5" />
      {eyes === "open" && (
        <g>
          <ellipse cx={17} cy={24} rx={2.2} ry={2.8} fill={INK} />
          <ellipse cx={31} cy={24} rx={2.2} ry={2.8} fill={INK} />
          <circle cx={17.7} cy={22.9} r={0.8} fill="#fff" />
          <circle cx={31.7} cy={22.9} r={0.8} fill="#fff" />
        </g>
      )}
      {eyes === "happy" && (
        <path d="M14.8 24.5q2.2-3 4.4 0M28.8 24.5q2.2-3 4.4 0" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      )}
      {eyes === "x" && (
        <path d="M15 22l4 2.2-4 2.2M33 22l-4 2.2 4 2.2" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      )}
      <path d="M21.6 29.2q1.2 1.3 2.4 0 1.2 1.3 2.4 0" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      {pose === "sniff" && (
        <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round">
          <circle cx={47} cy={32} r={5} fill="rgba(147,197,253,.35)" />
          <path d="M43.5 35.5 40 39" />
        </g>
      )}
      {pose === "fix" && (
        <g strokeLinecap="round">
          <path d="M40 39 48 31" stroke={INK} strokeWidth={4.2} />
          <path d="M40 39 48 31" stroke="#d4d7dc" strokeWidth={2.2} />
          <circle cx={49.6} cy={29.4} r={3.7} fill="#d4d7dc" stroke={INK} strokeWidth={1.4} />
          <circle cx={50.7} cy={28.3} r={1.4} fill="#08090a" />
        </g>
      )}
    </svg>
  );
}
