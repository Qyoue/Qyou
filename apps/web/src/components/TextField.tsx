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
  type = 'text',
  value,
  autoComplete,
  error,
  onChange,
}: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
