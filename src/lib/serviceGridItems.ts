import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Newspaper,
  Users,
  UserRound,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  Lightbulb,
  Heart,
  GraduationCap,
  Trophy,
  Medal,
  BookOpen,
  HandCoins,
  Briefcase,
  ClipboardList,
} from "lucide-react";

/** All app shortcuts shown on Dashboard and Services page */
export interface ServiceGridItem {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

export const SERVICE_GRID_ITEMS: ServiceGridItem[] = [
  { to: "/find-members", icon: UserRound, label: "Find people", color: "bg-indigo-500/10 text-indigo-600" },
  { to: "/news", icon: Newspaper, label: "News", color: "bg-primary/10 text-primary" },
  { to: "/history", icon: BookOpen, label: "Samaj History", color: "bg-rose-500/10 text-rose-700" },
  { to: "/directory", icon: Users, label: "Directory", color: "bg-orange-500/10 text-orange-600" },
  { to: "/events", icon: Calendar, label: "Events", color: "bg-purple-500/10 text-purple-600" },
  { to: "/gallery", icon: ImageIcon, label: "Gallery", color: "bg-pink-500/10 text-pink-600" },
  { to: "/documents", icon: FileText, label: "Documents", color: "bg-green-500/10 text-green-600" },
  { to: "/suggestions", icon: Lightbulb, label: "Ideas", color: "bg-yellow-500/10 text-yellow-600" },
  { to: "/matrimony", icon: Heart, label: "Matrimony", color: "bg-red-500/10 text-red-600" },
  { to: "/exams", icon: GraduationCap, label: "Exams", color: "bg-blue-500/10 text-blue-600" },
  { to: "/achievements?tab=mine", icon: Medal, label: "My achievements", color: "bg-amber-500/10 text-amber-800" },
  { to: "/achievements/new", icon: Trophy, label: "Add achievement", color: "bg-amber-500/10 text-amber-700" },
  { to: "/chat", icon: MessageCircle, label: "Chat", color: "bg-teal-500/10 text-teal-600" },
  { to: "/donate", icon: HandCoins, label: "Donate", color: "bg-emerald-500/10 text-emerald-600" },
  { to: "/business", icon: Briefcase, label: "Business", color: "bg-cyan-500/10 text-cyan-600" },
  { to: "/jobs", icon: ClipboardList, label: "Jobs", color: "bg-violet-500/10 text-violet-600" },
];
