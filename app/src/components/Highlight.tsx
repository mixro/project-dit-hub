// Marks the words a student searched for, so they can see why a result matched.
export function Highlight({ text, query }: { text: string; query?: string }) {
  const words = (query ?? "").toLowerCase().match(/[a-z0-9]{2,}/g);
  if (!words?.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}
