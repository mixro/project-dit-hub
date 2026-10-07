import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  initial?: string;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  /** Called while typing (debounced). Omit to only search on submit. */
  onChange?: (q: string) => void;
  onSubmit?: (q: string) => void;
  delayMs?: number;
}

export function SearchBox({ initial = "", placeholder = "Search problems, technologies, places…", autoFocus, large, onChange, onSubmit, delayMs = 220 }: Props) {
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => setValue(initial), [initial]);

  // Debounce: on a slow phone, re-filtering 750 projects per keystroke feels laggy.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!onChange) return;
    const t = setTimeout(() => onChange(value.trim()), delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur(); // close the phone keyboard
    onSubmit?.(value.trim());
  };

  return (
    <form role="search" className={`search${large ? " search-large" : ""}`} onSubmit={submit}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="search-icon">
        <path fill="currentColor" d="M10 4a6 6 0 1 0 3.9 10.6l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search projects"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {value && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setValue(""); onChange?.(""); }}>×</button>
      )}
      {onSubmit && <button type="submit" className="btn search-go">Search</button>}
    </form>
  );
}
