import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Calendar, MapPin, Clock, Image as ImageIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { eventsApi, userApi, cloudApi } from "@/lib/api";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

const eventTypes = [
  { id: "wedding", label: "Wedding" },
  { id: "cultural", label: "Cultural Program" },
  { id: "religious", label: "Religious Event" },
  { id: "meeting", label: "Meeting" },
  { id: "social", label: "Social Gathering" },
  { id: "sports", label: "Sports" },
  { id: "other", label: "Other" },
];

const RequiredStar = () => <span className="text-destructive">*</span>;

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function isValidTime(s: string): boolean {
  if (!s || !s.trim()) return true;
  return /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s.trim());
}

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<{ time: string; activity: string }[]>([]);
  const [organizerDisplayName, setOrganizerDisplayName] = useState("");
  const [organizerPhotoUrl, setOrganizerPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    userApi.getProfile().then((p) => {
      if (p?.fullName) setOrganizerDisplayName(p.fullName);
      if (p?.avatarUrl) setOrganizerPhotoUrl(p.avatarUrl);
    }).catch(() => {});
  }, []);

  function getValidationErrors(considerAllTouched = false): Record<string, string> {
    const e: Record<string, string> = {};
    if (considerAllTouched || touched.title !== undefined) {
      if (!title.trim()) e.title = "Event title is required.";
      else if (title.trim().length < 3) e.title = "Title must be at least 3 characters.";
      else if (title.trim().length > 200) e.title = "Title must be at most 200 characters.";
    }
    if (considerAllTouched || touched.eventType !== undefined) {
      if (!eventType) e.eventType = "Please select an event type.";
    }
    if (considerAllTouched || touched.date !== undefined) {
      if (!date) e.date = "Date is required.";
      else if (date < todayISO()) e.date = "Event date cannot be in the past.";
    }
    if (considerAllTouched || touched.time !== undefined) {
      if (time && !isValidTime(time)) e.time = "Enter a valid time (e.g. 10:00).";
    }
    if (considerAllTouched || touched.location !== undefined) {
      if (!location.trim()) e.location = "Venue / location is required.";
      else if (location.trim().length < 3) e.location = "Location must be at least 3 characters.";
    }
    return e;
  }

  const errors = getValidationErrors();

  const handleSubmit = async () => {
    setTouched({ title: true, eventType: true, date: true, time: true, location: true });
    const submitErrors = getValidationErrors(true);
    if (Object.keys(submitErrors).length > 0) {
      toast({ title: "Please fix the errors below.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const created = await eventsApi.create({
        title: title.trim(),
        type: eventType,
        date,
        time: time.trim() || undefined,
        location: location.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        organizerDisplayName: organizerDisplayName.trim() || undefined,
        organizerPhotoUrl: organizerPhotoUrl.trim() || undefined,
        schedule: scheduleItems.length > 0 ? scheduleItems : undefined,
      });

      toast({
        title: "Event Created",
        description: "Your event is now visible to the community.",
      });
      navigate(`/events/${created.id}`);
    } catch (err: unknown) {
      toast({
        title: "Failed to create event",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addScheduleRow = () => {
    setScheduleItems((prev) => [...prev, { time: "", activity: "" }]);
  };
  const updateSchedule = (index: number, field: "time" | "activity", value: string) => {
    setScheduleItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const removeScheduleRow = (index: number) => {
    setScheduleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const setTouchedField = (field: string) => () => setTouched((p) => ({ ...p, [field]: true }));

  return (
    <AppLayout title="Create Event">
      <div className="p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header – dashboard style */}
        <div className="rounded-2xl bg-gradient-primary p-5 md:p-6 text-primary-foreground">
          <Link to="/events" className="inline-flex items-center gap-1 text-sm opacity-90 hover:opacity-100 mb-3">
            ← Back to Events
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Add Event</h1>
          <p className="text-sm opacity-90 mt-1">Create an event and share it with the community.</p>
        </div>

        {/* Event details card */}
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 md:p-6">
            <SectionHeader title="Event details" subtitle="When, where, and what" className="mb-6" />

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="event-title">
                  Event Title <RequiredStar />
                </Label>
                <Input
                  id="event-title"
                  placeholder="e.g., Annual Gathering 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={setTouchedField("title")}
                  className={errors.title ? "border-destructive" : ""}
                  maxLength={200}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label>Event Type <RequiredStar /></Label>
                <Select value={eventType} onValueChange={(v) => { setEventType(v); setTouched((p) => ({ ...p, eventType: true })); }}>
                  <SelectTrigger className={errors.eventType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.eventType && <p className="text-sm text-destructive">{errors.eventType}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date <RequiredStar /></Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="event-date"
                      type="date"
                      min={todayISO()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onBlur={setTouchedField("date")}
                      className={`pl-10 ${errors.date ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Time (optional)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="event-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      onBlur={setTouchedField("time")}
                      className={`pl-10 ${errors.time ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.time && <p className="text-sm text-destructive">{errors.time}</p>}
                  <p className="text-xs text-muted-foreground">e.g. 10:00 AM – use 24h or pick from clock</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-location">Venue / Location <RequiredStar /></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="event-location"
                    placeholder="Enter venue or full address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onBlur={setTouchedField("location")}
                    className={`pl-10 ${errors.location ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-desc">Description (optional)</Label>
                <Textarea
                  id="event-desc"
                  placeholder="What’s the event about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover image card */}
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 md:p-6">
            <SectionHeader title="Cover image" subtitle="Upload via Cloud Service" className="mb-4" />
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="event-cover-file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setCoverUploading(true);
                    const { url } = await cloudApi.uploadEventImage(file);
                    setImageUrl(url);
                    toast({ title: "Cover image uploaded" });
                  } catch (err) {
                    toast({
                      title: "Upload failed",
                      description: err instanceof Error ? err.message : "Try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setCoverUploading(false);
                    e.target.value = "";
                  }
                }}
                disabled={coverUploading}
              />
              <label htmlFor="event-cover-file" className="cursor-pointer block">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {coverUploading ? "Uploading…" : "Click to upload cover image"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG (via Cloud Service)</p>
                {imageUrl && <p className="text-xs text-primary mt-2">Cover set</p>}
              </label>
            </div>
            <div className="mt-4">
              <ImageUrlWithUpload
                id="event-cover-url"
                label="Cover image URL"
                optional
                value={imageUrl}
                onChange={setImageUrl}
                folder="events"
                auth="user"
                helperText="Same cover as the quick upload above: paste a link or upload (one image)."
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule card */}
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 md:p-6">
            <SectionHeader title="Event schedule" subtitle="Optional – time slots and activities" className="mb-4" />
            {scheduleItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center mb-3">
                <Input
                  type="time"
                  placeholder="Time"
                  value={item.time}
                  onChange={(e) => updateSchedule(index, "time", e.target.value)}
                  className="w-32"
                />
                <Input
                  type="text"
                  placeholder="Activity"
                  value={item.activity}
                  onChange={(e) => updateSchedule(index, "activity", e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeScheduleRow(index)}>×</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addScheduleRow} className="gap-1">
              <Plus className="h-4 w-4" />
              Add schedule item
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Event"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/events">Cancel</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
