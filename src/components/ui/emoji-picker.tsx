import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJIS: { emoji: string; name: string; keywords: string[] }[] = [
  { emoji: "😀", name: "grinning face", keywords: ["smile", "happy"] },
  { emoji: "😁", name: "beaming face", keywords: ["grin", "happy"] },
  { emoji: "😂", name: "face with tears of joy", keywords: ["lol", "joy"] },
  { emoji: "🤣", name: "rolling on the floor laughing", keywords: ["rofl", "laugh"] },
  { emoji: "😊", name: "smiling face with smiling eyes", keywords: ["blush", "warm"] },
  { emoji: "😍", name: "smiling face with heart-eyes", keywords: ["love", "hearts"] },
  { emoji: "😘", name: "face blowing a kiss", keywords: ["kiss", "love"] },
  { emoji: "😎", name: "smiling face with sunglasses", keywords: ["cool"] },
  { emoji: "😇", name: "smiling face with halo", keywords: ["angel", "good"] },
  { emoji: "🥰", name: "smiling face with hearts", keywords: ["in love", "hearts"] },
  { emoji: "🙏", name: "folded hands", keywords: ["namaste", "please", "thanks"] },
  { emoji: "👍", name: "thumbs up", keywords: ["ok", "good", "approve"] },
  { emoji: "👎", name: "thumbs down", keywords: ["bad", "disapprove"] },
  { emoji: "👏", name: "clapping hands", keywords: ["applause", "congrats"] },
  { emoji: "🎉", name: "party popper", keywords: ["celebration", "party"] },
  { emoji: "❤️", name: "red heart", keywords: ["heart", "love"] },
  { emoji: "💔", name: "broken heart", keywords: ["sad", "heartbreak"] },
  { emoji: "🔥", name: "fire", keywords: ["lit", "hot"] },
  { emoji: "⭐", name: "star", keywords: ["favourite"] },
  { emoji: "✅", name: "check mark button", keywords: ["done", "ok"] },
  { emoji: "❌", name: "cross mark", keywords: ["wrong", "no"] },
  { emoji: "🏆", name: "trophy", keywords: ["winner", "achievement"] },
  { emoji: "👨‍🎓", name: "man student", keywords: ["exam", "graduate"] },
  { emoji: "👩‍🎓", name: "woman student", keywords: ["exam", "graduate"] },
  { emoji: "💼", name: "briefcase", keywords: ["work", "business"] },
  { emoji: "📚", name: "books", keywords: ["study", "education"] },
  { emoji: "📍", name: "round pushpin", keywords: ["location", "place"] },
  { emoji: "🕉️", name: "om symbol", keywords: ["spiritual", "om"] },
  { emoji: "🇮🇳", name: "flag India", keywords: ["india", "bharat"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EMOJIS;
    return EMOJIS.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      return e.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add emoji"
        >
          <Smile className="h-5 w-5 text-amber-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3 z-[100]">
        <Input
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm"
        />
        <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.emoji + e.name}
              type="button"
              className="flex items-center justify-center text-xl p-1 rounded hover:bg-muted"
              onClick={() => {
                onSelect(e.emoji);
                setOpen(false);
              }}
            >
              {e.emoji}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-7 text-xs text-muted-foreground text-center py-2">
              No emojis found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

