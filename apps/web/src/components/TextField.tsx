import { useState } from "react";

interface TextFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  autoComplete?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  name,
  type = "text",
  value,
  autoComplete,
  error,
  onChange,
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          style={{ flex: 1 }}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ marginLeft: 8 }}
            data-testid="password-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
