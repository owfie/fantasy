/**
 * Generic CRUD components that can be reused for different entities
 * Provides a single source of truth for styling and behavior
 */

'use client';

import React from 'react';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface TestResultDisplayProps<T = unknown> {
  testName: string;
  isLoading: boolean;
  result?: TestResult<T>;
  hideSuccess?: boolean; // Option to hide success messages
}

/**
 * Generic component to display test results
 */
export function TestResultDisplay<T = unknown>({ isLoading, result, hideSuccess = true }: TestResultDisplayProps<T>) {
  // Hide if no result and not loading, or if result is successful and hideSuccess is true
  if ((!result && !isLoading) || (result?.success && hideSuccess)) return null;

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: result?.success ? '#d4edda' : '#f8d7da', borderRadius: '4px', fontSize: '0.9rem' }}>
      {isLoading ? (
        <div>Running...</div>
      ) : (
        <>
          <div><strong>{result?.success ? '✅' : '❌'}</strong> {result?.message}</div>
          {result?.error && <div style={{ color: '#721c24', marginTop: '0.25rem' }}>{result.error}</div>}
          {result?.data && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Data</summary>
              <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Generic form field wrapper
 */
export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
        {label} {required && '*'}
      </label>
      {children}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Generic form input with consistent styling
 */
export function FormInput({ value, onChange, ...props }: FormInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
      {...props}
    />
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
}

/**
 * Generic form select with consistent styling
 */
export function FormSelect({ value, onChange, options, ...props }: FormSelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface FormNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Generic number input with consistent styling
 */
export function FormNumberInput({ value, onChange, ...props }: FormNumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
      {...props}
    />
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  isLoading?: boolean;
}

/**
 * Generic button with consistent styling and variants
 */
export function Button({ variant = 'primary', isLoading, disabled, children, ...props }: ButtonProps) {
  const variantStyles: Record<string, { background: string; color: string }> = {
    primary: { background: '#007bff', color: 'white' },
    success: { background: '#28a745', color: 'white' },
    warning: { background: '#ffc107', color: 'black' },
    danger: { background: '#dc3545', color: 'white' },
    info: { background: '#17a2b8', color: 'white' },
    secondary: { background: '#6c757d', color: 'white' },
  };

  const style = variantStyles[variant] || variantStyles.primary;
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      style={{
        padding: '0.5rem 1rem',
        background: isDisabled ? '#ccc' : style.background,
        color: style.color,
        border: 'none',
        borderRadius: '4px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...props.style,
      }}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Generic form section wrapper
 */
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

/**
 * Helper function to format date consistently (avoids hydration errors)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

