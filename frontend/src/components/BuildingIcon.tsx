import type { ReactNode } from 'react'

const ICON_MAP: Record<string, ReactNode> = {
  box: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" fill="none" strokeWidth="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="5" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15" y1="5" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  cylinder: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <ellipse cx="12" cy="5" rx="7" ry="2.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
      <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.5" />
      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="19" rx="7" ry="2.5" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <path d="M5 19 A7 2.5 0 0 0 19 19" stroke="currentColor" fill="none" strokeWidth="1.5" />
    </svg>
  ),
  prism: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <polygon points="12,2 20,8 17,20 7,20 4,8" stroke="currentColor" fill="none" strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="20" y1="8" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="4" y1="8" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  ),
  'l-shape': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M3,3 H9 V15 H21 V21 H3 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
    </svg>
  ),
  'u-shape': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M3,3 H7 V18 H17 V3 H21 V21 H3 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
    </svg>
  ),
  't-shape': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M3,3 H21 V8 H15 V21 H9 V8 H3 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
    </svg>
  ),
  stepped: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M3,19 H8 V15 H13 V10 H18 V5 H21 V19 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <line x1="8" y1="15" x2="8" y2="19" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="13" y1="10" x2="13" y2="19" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="18" y1="5" x2="18" y2="19" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  ),
  'podium-tower': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="3" y="14" width="18" height="8" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <rect x="8" y="4" width="8" height="10" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
    </svg>
  ),
  dome: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="5" y="14" width="14" height="8" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <path d="M5,14 Q5,4 12,4 Q19,4 19,14" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
    </svg>
  ),
  'gable-roof': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="5" y="10" width="14" height="12" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <path d="M3,10 L12,3 L21,10 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
    </svg>
  ),
  road: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="4" y="2" width="16" height="20" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" />
      <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" />
      <line x1="12" y1="20" x2="12" y2="20" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'green-belt': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="2" y="10" width="20" height="4" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
      <circle cx="5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="9" cy="7" r="1.5" fill="currentColor" />
      <circle cx="13" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="17" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="21" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="10.5" y="16" width="3" height="6" stroke="currentColor" fill="currentColor" fillOpacity="0.8" strokeWidth="1.5" />
      <path d="M5,16 L12,4 L19,16 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
      <path d="M7,12 L12,4 L17,12 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.6" strokeWidth="1" />
    </svg>
  ),
  river: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M0,8 Q8,6 12,10 Q16,14 24,12 Q16,16 12,12 Q8,8 0,10 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.5" strokeWidth="1.5" />
    </svg>
  ),
  'ai-circular': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <circle cx="12" cy="12" r="9" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" strokeWidth="1.5" strokeOpacity="0.5" />
      <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">AI</text>
    </svg>
  ),
  'ai-complex': (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="4" y="8" width="6" height="14" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <rect x="11" y="4" width="5" height="10" stroke="currentColor" fill="currentColor" fillOpacity="0.4" strokeWidth="1.5" />
      <rect x="16" y="10" width="4" height="12" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <text x="12" y="22" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">AI</text>
    </svg>
  ),
  glb: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
      <path d="M8,8 L12,14 L16,8" stroke="currentColor" fill="none" strokeWidth="1.5" />
      <rect x="8" y="16" width="8" height="2" fill="currentColor" />
      <text x="12" y="22" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">GLB</text>
    </svg>
  ),
}

export function BuildingIcon({ name }: { name: string }) {
  return <>{ICON_MAP[name] ?? null}</>
}
