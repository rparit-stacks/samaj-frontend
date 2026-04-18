import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const SUGGESTED_LOCATIONS = [
  "Ahmedabad, Gujarat",
  "Mumbai, Maharashtra",
  "Delhi",
  "Bangalore, Karnataka",
  "Chennai, Tamil Nadu",
  "Hyderabad, Telangana",
  "Pune, Maharashtra",
  "Kolkata, West Bengal",
  "Jaipur, Rajasthan",
  "Surat, Gujarat",
  "Lucknow, Uttar Pradesh",
  "Indore, Madhya Pradesh",
  "Nagpur, Maharashtra",
  "Bhopal, Madhya Pradesh",
  "Patna, Bihar",
  "Chandigarh",
  "Coimbatore, Tamil Nadu",
  "Vadodara, Gujarat",
  "Noida, Uttar Pradesh",
  "Gurgaon, Haryana",
];

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationPicker({
  value,
  onChange,
  placeholder = "Add location",
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUGGESTED_LOCATIONS;
    return SUGGESTED_LOCATIONS.filter((loc) =>
      loc.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (location: string) => {
    onChange(location);
    setOpen(false);
    setSearch("");
  };

  const handleUseCustom = () => {
    if (search.trim()) {
      onChange(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          aria-label="Add location"
        >
          <MapPin className="h-4 w-4 text-red-500" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 space-y-3 z-[100]"
        align="start"
        sideOffset={8}
      >
        <Input
          placeholder="Search or type location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUseCustom();
          }}
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((loc) => (
            <button
              key={loc}
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2"
              onClick={() => handleSelect(loc)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {loc}
            </button>
          ))}
          {filtered.length === 0 && search.trim() && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2"
              onClick={handleUseCustom}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              Use &quot;{search.trim()}&quot;
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
