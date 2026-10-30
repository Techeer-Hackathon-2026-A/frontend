// 프로토타입과 같은 16px 선 아이콘
const PATHS = {
  scan: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/>',
  pr: '<circle cx="4" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="12.5" r="1.5"/><path d="M4 5v6M12 11V6.5a2 2 0 0 0-2-2H7.5M9 3 7.5 4.5 9 6"/>',
  branch: '<circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="4.5" r="1.5"/><path d="M4.5 5v6M11.5 6c0 3.5-7 2.5-7 5"/>',
  chev: '<path d="m6 3.5 4.5 4.5L6 12.5"/>',
  check: '<path d="m3.5 8.5 3 3 6-7"/>',
  arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  ext: '<path d="M6 3H3.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10M9 3h4v4M13 3 7.5 8.5"/>',
  bug: '<path d="M5.5 5.5a2.5 2.5 0 0 1 5 0M4.5 6.5h7v3a3.5 3.5 0 0 1-7 0ZM8 6.5V13M2.5 8.5h2M11.5 8.5h2M3 12l1.8-1.2M13 12l-1.8-1.2M3 5l1.6 1.4M13 5l-1.6 1.4"/>',
  shield: '<path d="M8 1.75 13 4v3.5c0 3-2.1 5.4-5 6.25-2.9-.85-5-3.25-5-6.25V4Z"/><path d="m5.75 7.75 1.6 1.6 3-3.1"/>',
  play: '<path d="M5 3.5v9l7-4.5Z"/>',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`size-4 flex-none fill-none stroke-current ${className}`}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  )
}
