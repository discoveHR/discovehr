"use client";

import { useEffect, useRef, useState, useMemo } from "react";

const DAYS_HDR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  optional?: boolean;
};

function parseValue(val: string) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(d: Date) {
  return d.toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function DateTimePicker({ label, value, onChange, required, optional }: Props) {
  const parsed = parseValue(value);
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const [timeVal, setTimeVal] = useState(
    parsed ? `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}` : "09:00",
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedDateKey = parsed ? toDateKey(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : "";
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const calDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    onChange(`${dateKey}T${timeVal}`);
  }

  function handleTimeChange(t: string) {
    setTimeVal(t);
    if (selectedDateKey) {
      onChange(`${selectedDateKey}T${t}`);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  }

  return (
    <div className="dtp-wrap" ref={wrapRef}>
      <div className="dtp-label-row">
        <span className="dtp-label">{label}{required ? " *" : ""}{optional ? " (optional)" : ""}</span>
        {parsed && optional && (
          <button type="button" className="dtp-clear-btn" onClick={handleClear}>Clear</button>
        )}
      </div>

      <button type="button" className={`dtp-trigger ${open ? "dtp-trigger-open" : ""} ${parsed ? "dtp-trigger-filled" : ""}`} onClick={() => setOpen((p) => !p)}>
        <span className="dtp-trigger-icon">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <span className="dtp-trigger-value">
          {parsed ? formatDisplay(parsed) : "Pick date & time…"}
        </span>
        <span className="dtp-trigger-caret">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="dtp-dropdown">
          {/* Month navigation */}
          <div className="dtp-cal-header">
            <button type="button" className="dtp-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="dtp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dtp-nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="dtp-cal-grid">
            {DAYS_HDR.map((d) => (
              <span key={d} className="dtp-day-hdr">{d}</span>
            ))}
            {calDays.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const key = toDateKey(viewYear, viewMonth, day);
              const isSelected = key === selectedDateKey;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={`dtp-day-btn${isSelected ? " dtp-day-selected" : ""}${isToday && !isSelected ? " dtp-day-today" : ""}`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="dtp-time-section">
            <span className="dtp-time-label">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
              </svg>
              Time
            </span>
            <input
              type="time"
              className="dtp-time-input"
              value={timeVal}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="dtp-footer">
            {parsed && (
              <span className="dtp-selected-summary">
                {formatDisplay(parsed)}
              </span>
            )}
            <button type="button" className="dtp-done-btn" onClick={() => setOpen(false)}>
              {parsed ? "Done" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

