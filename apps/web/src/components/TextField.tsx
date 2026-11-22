import { useState } from "react";
import styles from "./TextField.module.css";

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
    <div className={`field ${styles.field}`}>
      <label htmlFor={name} className={styles.label}>{label}</label>
      <div className={styles.inputRow}>
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          className={[styles.input, error ? styles.inputInvalid : ""].filter(Boolean).join(" ")}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.toggle}
            data-testid="password-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error ? <p className={`field-error ${styles.error}`}>{error}</p> : null}
    </div>
  );
}
