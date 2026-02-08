'use client';

interface BudgetSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function BudgetSlider({ value, onChange }: BudgetSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium">Budget</label>
        <span className="text-sm font-mono">${value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>$0</span>
        <span>$1,000</span>
      </div>
    </div>
  );
}
