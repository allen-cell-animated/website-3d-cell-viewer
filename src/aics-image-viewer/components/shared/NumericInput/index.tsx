import React from "react";
import { Icon } from "antd";

import "./styles.css";

interface NumericInputProps {
  value: number;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
}

/**
 * Fully-controlled numeric input (value must be supplied from state in parent).
 * Changeable with arrow keys, typing, or clickable arrows.
 */
const NumericInput: React.FC<NumericInputProps> = ({
  value,
  step = 1,
  precision = step,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  className = "",
  onChange,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fullClassName = "numinput" + (disabled ? " numinput-disabled" : "") + (className && ` ${className}`);

  const clamp = (newValue: number): number => Math.min(Math.max(newValue, min), max);
  const roundToPrecision = (newValue: number): number => clamp(Math.round(newValue * precision) / precision);

  const onChangeChecked = (newValue: number): void => {
    if (newValue !== value && !disabled && !isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const changeByStep = (up: boolean): void => {
    const delta = up ? step : -step;
    onChangeChecked(clamp(value + delta));
    inputRef.current?.focus();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (["Up", "ArrowUp", "Down", "ArrowDown"].includes(event.key)) {
      changeByStep(event.key === "Up" || event.key === "ArrowUp");
      event.preventDefault();
    }
  };

  return (
    <div className={fullClassName} onKeyDown={onKeyDown}>
      <input
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="numinput-input"
        autoComplete="off"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        ref={inputRef}
        onChange={({ target }) => onChangeChecked(roundToPrecision(parseFloat(target.value)))}
      />
      <div className="numinput-controls">
        <div
          className="numinput-controls-button numinput-controls-button-up"
          unselectable="on"
          role="button"
          aria-label="Increase Value"
          aria-disabled={disabled}
          onClick={() => changeByStep(true)}
        >
          <Icon className="numinput-controls-button-icon" type="up" />
        </div>
        <div
          className="numinput-controls-button numinput-controls-button-down"
          unselectable="on"
          role="button"
          aria-label="Decrease Value"
          aria-disabled={disabled}
          onClick={() => changeByStep(false)}
        >
          <Icon className="numinput-controls-button-icon" type="down" />
        </div>
      </div>
    </div>
  );
};

export default NumericInput;
