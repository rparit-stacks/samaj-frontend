import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventCard } from "@/components/ui/event-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCardSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyEvents } from "@/components/ui/empty-state";
import { eventsApi } from "@/lib/api";

const eventTypes = [
  { id: "all", label: "All" },
  { id: "wedding", label: "Wedding" },
  { id: "meeting", label: "Meeting" },
  { id: "cultural", label: "Cultural" },
  { id: "religious", label: "Religious" },
  { id: "social", label: "Social" },
  { id: "sports", label: "Sports" },
  { id: "other", label: "Other" },
];

function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
  return days;
}

export default function Events() {
  const [selectedType, setSelectedType] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "topic">("list");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const sort = viewMode === "calendar" ? "list" : viewMode === "topic" ? "topic" : "list";
  const typeParam = selectedType === "all" ? undefined : selectedType;

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events", sort, typeParam],
    queryFn: () => eventsApi.list({ sort, type: typeParam }),
  });

  const filteredEvents = events.filter((event) => {
    return selectedType === "all" || event.type.toLowerCase() === selectedType;
  });

  const calendarDays = generateCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction));
  };

  return (
    <AppLayout title="Events">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">Community gatherings and celebrations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/events/create">Create Event</Link>
            </Button>
            <div className="flex border rounded-lg self-start">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button
                variant={viewMode === "topic" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("topic")}
                className="gap-2"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Topics</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {eventTypes.map((type) => (
            <Button
              key={type.id}
              variant={selectedType === type.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type.id)}
              className="flex-shrink-0 rounded-full"
            >
              {type.label}
            </Button>
          ))}
        </div>

        {error && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Failed to load events"}
          </p>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : viewMode === "list" || viewMode === "topic" ? (
          filteredEvents.length === 0 ? (
            <div className="bg-card rounded-2xl">
              <EmptyEvents />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  type={event.type}
                  date={event.date}
                  time={event.time ?? undefined}
                  location={event.location}
                  attendees={event.goingCount}
                  rsvpStatus={
                    event.currentUserRsvpStatus === "going"
                      ? "going"
                      : event.currentUserRsvpStatus === "interested"
                        ? "interested"
                        : event.currentUserRsvpStatus === "not_going"
                          ? "not_going"
                          : null
                  }
                  image={event.imageUrl ?? undefined}
                />
              ))}
            </div>
          )
        ) : (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const today = new Date();
                  const isToday =
                    day !== null &&
                    currentDate.getMonth() === today.getMonth() &&
                    currentDate.getFullYear() === today.getFullYear() &&
                    day === today.getDate();

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[80px] md:min-h-[100px] p-1 rounded-lg border border-transparent",
                        day ? "hover:border-primary/50 cursor-pointer" : "",
                        isToday && "bg-primary/5 border-primary"
                      )}
                    >
                      {day !== null && (
                        <>
                          <span
                            className={cn("text-sm font-medium", isToday && "text-primary")}
                          >
                            {day}
                          </span>
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <EventCard
                                key={event.id}
                                id={event.id}
                                title={event.title}
                                type={event.type}
                                date={event.date}
                                time={event.time ?? undefined}
                                location={event.location}
                                variant="calendar"
                              />
                            ))}
                            {dayEvents.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{dayEvents.length - 2} more
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
