import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { communityApi } from "@/lib/api";

interface TagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function TagPicker({
  value,
  onChange,
  placeholder = "Add tags",
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: topTags = [] } = useQuery({
    queryKey: ["topTags"],
    queryFn: () => communityApi.getTopTags(20),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topTags;
    return topTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [search, topTags]);

  const addTag = (tagNameOrSlug: string, isSlug = false) => {
    const slug = isSlug
      ? tagNameOrSlug.trim().toLowerCase()
      : slugify(tagNameOrSlug);
    if (!slug) return;
    const normalized = slug
      .split("-")
      .filter(Boolean)
      .join("-");
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setSearch("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const input = search.trim();
      if (input) addTag(input);
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
          aria-label="Add tags"
        >
          <Tag className="h-4 w-4 text-primary" />
          {value.length > 0 ? `${value.length} tag(s)` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 space-y-3 z-[100]"
        align="start"
        sideOffset={8}
      >
        <Input
          placeholder="Type tag and press Enter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 text-sm"
        />
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-xs rounded-full pr-1"
              >
                #{t}
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="max-h-36 overflow-y-auto space-y-0.5">
          <p className="text-xs text-muted-foreground mb-1.5">Trending</p>
          {filtered.map((t) => {
            const slug = t.slug;
            const added = value.includes(slug);
            return (
              <button
                key={t.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center justify-between"
                onClick={() => {
                  if (added) removeTag(slug);
                  else addTag(slug, true);
                }}
              >
                <span>#{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.postCount} posts
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No tags found. Type above and press Enter to add custom tags.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
