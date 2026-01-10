'use client';

import styles from './index.module.scss';

export interface SegmentedControllerOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControllerProps<T extends string> {
  options: SegmentedControllerOption<T>[];
  selectedValues: T[];
  onChange: (values: T[]) => void;
  allowMultiple?: boolean;
  minSelections?: number;
}

export function SegmentedController<T extends string>({
  options,
  selectedValues,
  onChange,
  allowMultiple = false,
  minSelections = 0,
}: SegmentedControllerProps<T>) {
  const handleOptionClick = (optionId: T) => {
    if (allowMultiple) {
      // Multi-select mode
      if (selectedValues.includes(optionId)) {
        // If already selected, check if we can deselect it (respect minSelections)
        if (selectedValues.length > minSelections) {
          onChange(selectedValues.filter(id => id !== optionId));
        }
      } else {
        // Add to selection
        onChange([...selectedValues, optionId]);
      }
    } else {
      // Single-select mode
      onChange([optionId]);
    }
  };

  return (
    <div className={styles.segmentedController}>
      {options.map(option => {
        const isActive = selectedValues.includes(option.id);
        const isDisabled = allowMultiple && 
          minSelections > 0 && 
          selectedValues.length === minSelections && 
          isActive;

        return (
          <button
            key={option.id}
            className={`${styles.segment} ${isActive ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
            onClick={() => handleOptionClick(option.id)}
            disabled={isDisabled}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

