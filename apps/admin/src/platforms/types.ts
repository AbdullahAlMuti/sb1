import { LucideIcon } from "lucide-react";
import React from "react";

export interface PlatformTab {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
}

export interface PlatformColorTheme {
  primaryBg: string;
  primaryText: string;
  primaryBorder: string;
  accentBg: string;
  iconBg: string;
  iconText: string;
  iconBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  primaryButton: string;
}

export interface PlatformDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  enabled: boolean;
  colorTheme: PlatformColorTheme;
  tabs: PlatformTab[];
  rightColumnComponent?: React.ComponentType<any>;
}
