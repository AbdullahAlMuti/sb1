/**
 * Maps Lucide icon name strings (as stored in DB content) to React components.
 * Only icons actually used in homepage content are included — no dynamic import needed.
 */
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  HelpCircle,
  Image,
  LayoutDashboard,
  Linkedin,
  Lock,
  Mail,
  MessageCircle,
  Menu,
  Newspaper,
  PanelRightOpen,
  Rocket,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
  Twitter,
  X,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ArrowRight,
  BarChart2,
  BookOpen,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  HelpCircle,
  Image,
  LayoutDashboard,
  Linkedin,
  Lock,
  Mail,
  MessageCircle,
  Menu,
  Newspaper,
  PanelRightOpen,
  Rocket,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
  Twitter,
  X,
  Youtube,
  Zap,
};

/** Returns the Lucide component for `name`, or a safe fallback (CheckCircle2). */
export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? CheckCircle2;
}

interface IconProps {
  name: string;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const Ic = resolveIcon(name);
  return <Ic className={className} />;
}
