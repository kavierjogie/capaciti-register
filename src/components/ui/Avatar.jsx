// Figma "Avatar": initials, S=32 / M=40 / L=88.
const SIZES = { s: 'size-8 text-xs', m: 'size-10 text-sm', l: 'size-[88px] text-2xl' }

export const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

export default function Avatar({ name, size = 's', tone = 'pink' }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-medium text-kadet
      ${tone === 'pink' ? 'bg-pink' : 'bg-purple-tint'} ${SIZES[size]}`}>
      {initials(name)}
    </span>
  )
}
