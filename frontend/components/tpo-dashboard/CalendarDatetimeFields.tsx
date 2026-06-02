"use client";

type CalendarDatetimeFieldsProps = {
  label: string;
  dateName: string;
  timeName: string;
  required?: boolean;
  defaultDate?: string;
  defaultTime?: string;
};

/** Split server datetime into date + time for inputs. */
export function splitServerDatetime(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const normalized = value.trim().replace(" ", "T");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match) return { date: match[1], time: match[2] };
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function CalendarDatetimeFields({
  label,
  dateName,
  timeName,
  required,
  defaultDate = "",
  defaultTime = "09:00",
}: CalendarDatetimeFieldsProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="calendar-datetime-fields">
      <span className="calendar-datetime-label">{label}</span>
      <div className="calendar-datetime-inputs">
        <label className="calendar-datetime-part">
          <span>Date</span>
          <input type="date" name={dateName} required={required} min={today} defaultValue={defaultDate} />
        </label>
        <label className="calendar-datetime-part">
          <span>Time</span>
          <input type="time" name={timeName} required={required} defaultValue={defaultTime} step={300} />
        </label>
      </div>
    </div>
  );
}
