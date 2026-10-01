import type { Config, Group } from "commandmenu";
import type { ElementType } from "react";
import {
  BellIcon,
  BookIcon,
  CopyIcon,
  FileIcon,
  GlobeIcon,
  HomeIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  TerminalIcon,
  UserIcon,
} from "../../../components/icons";

export type MenuItem = Config & { icon: ElementType; description: string };

export type MenuLevel = {
  label: string;
  config: MenuItem[];
  groups?: Group<MenuItem>[];
};

export const SUBMENU_IDS = new Set(["settings", "theme"]);

// Shortcuts stay clear of the ones a browser keeps for itself (⌘N and ⌘T open
// windows and tabs whatever the page does) and of ⌘C, which would swallow
// copying text out of the search field.
export const createRootConfig = (
  leaf: (label: string) => () => void,
  openSubmenu: (level: MenuLevel) => void,
): MenuItem[] => [
  {
    id: "home",
    icon: HomeIcon,
    label: "Home",
    description: "Go to homepage",
    onSelect: leaf("Navigated to Home"),
  },
  {
    id: "docs",
    icon: BookIcon,
    label: "Documentation",
    description: "Read the docs",
    shortcut: "D",
    onSelect: leaf("Opened Documentation"),
  },
  {
    id: "about",
    icon: UserIcon,
    label: "About",
    description: "Learn more about us",
    onSelect: leaf("Navigated to About"),
  },
  {
    id: "contact",
    icon: MailIcon,
    label: "Contact",
    description: "Get in touch",
    onSelect: leaf("Opened Contact"),
  },
  {
    id: "open-file",
    icon: FileIcon,
    label: "Open File",
    description: "Open a project file",
    shortcut: "O",
    onSelect: leaf("Opened File"),
  },
  {
    id: "search",
    icon: SearchIcon,
    label: "Search",
    description: "Search the project",
    shortcut: "F",
    onSelect: leaf("Opened Search"),
  },
  {
    id: "copy",
    icon: CopyIcon,
    label: "Copy Link",
    description: "Copy current URL",
    shortcut: "K",
    onSelect: leaf("Link Copied"),
  },
  {
    id: "terminal",
    icon: TerminalIcon,
    label: "Open Terminal",
    description: "Launch terminal",
    shortcut: "J",
    onSelect: leaf("Opened Terminal"),
  },
  {
    id: "settings",
    icon: SettingsIcon,
    label: "Settings",
    description: "Open preferences",
    shortcut: "⇧ S",
    onSelect: () =>
      openSubmenu({
        label: "Settings",
        config: [
          {
            id: "theme",
            icon: PaletteIcon,
            label: "Theme",
            description: "Change appearance",
            onSelect: () =>
              openSubmenu({
                label: "Theme",
                config: [
                  {
                    id: "light",
                    icon: SunIcon,
                    label: "Light",
                    description: "Light mode",
                    onSelect: leaf("Switched to Light theme"),
                  },
                  {
                    id: "dark",
                    icon: MoonIcon,
                    label: "Dark",
                    description: "Dark mode",
                    onSelect: leaf("Switched to Dark theme"),
                  },
                  {
                    id: "system",
                    icon: MonitorIcon,
                    label: "System",
                    description: "Follow system",
                    onSelect: leaf("Switched to System theme"),
                  },
                ],
              }),
          },
          {
            id: "language",
            icon: GlobeIcon,
            label: "Language",
            description: "Change language",
            onSelect: leaf("Opened Language settings"),
          },
          {
            id: "notifications",
            icon: BellIcon,
            label: "Notifications",
            description: "Manage alerts",
            onSelect: leaf("Opened Notifications"),
          },
          {
            id: "privacy",
            icon: ShieldIcon,
            label: "Privacy",
            description: "Security settings",
            onSelect: leaf("Opened Privacy settings"),
          },
        ],
        groups: [
          {
            id: "settings-items",
            label: "Settings",
            items: ["theme", "language", "notifications", "privacy"],
          },
        ],
      }),
  },
];

export const ROOT_GROUPS: Group<MenuItem>[] = [
  { id: "navigation", label: "Navigation", items: ["home", "docs", "about", "contact"] },
  {
    id: "actions",
    label: "Actions",
    items: ["open-file", "search", "copy", "terminal", "settings"],
  },
];
