import React, { useEffect, useRef, useState } from 'react';

export interface FlushRegistry {
  register: (id: string, flushFn: () => void) => void;
  unregister: (id: string) => void;
  flushAll: () => void;
}

export function createFlushRegistry(): FlushRegistry {
  const callbacks = new Map<string, () => void>();
  return {
    register(id, flushFn) {
      callbacks.set(id, flushFn);
    },
    unregister(id) {
      callbacks.delete(id);
    },
    flushAll() {
      for (const fn of callbacks.values()) {
        fn();
      }
    }
  };
}

interface DebouncedTextareaProps {
  id: string;
  value: string;
  onCommit: (nextValue: string) => void;
  flushRegistry?: FlushRegistry;
  placeholder?: string;
  rows?: number;
  label?: string;
  className?: string;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = React.memo(
  ({
    id,
    value,
    onCommit,
    flushRegistry,
    placeholder = 'Введите уточнение или собственные примеры...',
    rows = 2,
    label,
    className = ''
  }) => {
    const [localValue, setLocalValue] = useState<string>(value);
    const latestLocalRef = useRef<string>(value);
    const latestCommittedRef = useRef<string>(value);
    const onCommitRef = useRef(onCommit);
    const timerRef = useRef<number | null>(null);

    onCommitRef.current = onCommit;

    useEffect(() => {
      setLocalValue(value);
      latestLocalRef.current = value;
      latestCommittedRef.current = value;
    }, [value]);

    const flushImmediately = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (latestLocalRef.current !== latestCommittedRef.current) {
        latestCommittedRef.current = latestLocalRef.current;
        onCommitRef.current(latestLocalRef.current);
      }
    };

    useEffect(() => {
      if (!flushRegistry) return;
      flushRegistry.register(id, flushImmediately);
      return () => {
        flushImmediately();
        flushRegistry.unregister(id);
      };
    }, [id, flushRegistry]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setLocalValue(next);
      latestLocalRef.current = next;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (latestLocalRef.current !== latestCommittedRef.current) {
          latestCommittedRef.current = latestLocalRef.current;
          onCommitRef.current(latestLocalRef.current);
        }
      }, 250);
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={id}
          rows={rows}
          value={localValue}
          onChange={handleChange}
          onBlur={flushImmediately}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 ${className}`}
        />
      </div>
    );
  }
);
DebouncedTextarea.displayName = 'DebouncedTextarea';
