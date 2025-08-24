import { useEffect, useState } from "react";

const AvailabilityPicker = ({ value, onChange }: AvailabilityPickerProps) => {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [availability, setAvailability] = useState<DayAvailability>(
    value ||
      daysOfWeek.reduce((acc, day) => {
        acc[day] = { start: "09:00", end: "17:00", enabled: false };
        return acc;
      }, {} as DayAvailability)
  );

  useEffect(() => {
    if (onChange) {
      onChange(availability); // notify parent whenever it changes
    }
  }, [availability]);

  useEffect(() => {
    if (value) {
      setAvailability(value); // update local state when parent value changes
    }
  }, [value]);

  const handleAvailabilityChange = (
    day: string,
    field: "start" | "end" | "enabled",
    value: string | boolean
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium">Availability</label>
      <div className="space-y-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={availability[day].enabled}
              onChange={(e) =>
                handleAvailabilityChange(day, "enabled", e.target.checked)
              }
              className="h-4 w-4 text-blue-500 border-gray-300 rounded"
            />
            <span className="w-10">{day}</span>
            <input
              type="time"
              value={availability[day].start}
              disabled={!availability[day].enabled}
              onChange={(e) =>
                handleAvailabilityChange(day, "start", e.target.value)
              }
              className="border border-gray-300 rounded p-1 w-24"
            />
            <span>-</span>
            <input
              type="time"
              value={availability[day].end}
              disabled={!availability[day].enabled}
              onChange={(e) =>
                handleAvailabilityChange(day, "end", e.target.value)
              }
              className="border border-gray-300 rounded p-1 w-24"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityPicker;
