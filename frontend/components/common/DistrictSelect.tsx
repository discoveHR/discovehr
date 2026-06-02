"use client";

import { useIndiaDistricts } from "../../lib/hooks/useIndiaDistricts";

type DistrictSelectProps = {
  state: string;
  country?: string;
  value: string;
  onChange: (district: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
};

export function DistrictSelect({
  state,
  country = "India",
  value,
  onChange,
  disabled = false,
  className,
  required = false,
  id,
  placeholder = "Select district",
}: DistrictSelectProps) {
  const { districts, loading, error } = useIndiaDistricts(state, country);
  const useDropdown = country === "India" && Boolean(state.trim());

  if (!useDropdown) {
    return (
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder === "Select district" ? "e.g. Pune" : placeholder}
        disabled={disabled}
        required={required}
      />
    );
  }

  return (
    <div className="district-select-wrap">
      <select
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || !state}
        required={required}
      >
        <option value="">{loading ? "Loading districts…" : placeholder}</option>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
        {value && !districts.includes(value) ? (
          <option value={value}>{value}</option>
        ) : null}
      </select>
      {error ? <p className="district-select-hint district-select-hint--error">{error}</p> : null}
      {!loading && !error && districts.length === 0 && state ? (
        <p className="district-select-hint">No districts found for this state.</p>
      ) : null}
    </div>
  );
}
