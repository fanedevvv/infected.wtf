export type EditorTile =
  | "profile" | "look" | "background" | "effects" | "music" | "links"
  | "widgets" | "badges" | "aliases" | "bestfriend" | "sharing" | "skills";

// `form` lists the ProfileInfoForm sections a tile shows above its own panel.
export const EDITOR_TILES: { id: EditorTile; label: string; desc: string; form: string[]; icon: string }[] = [
  { id: "profile", label: "Profile", desc: "Your identity card, avatar and bio", form: ["profile", "visuals"], icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id: "look", label: "Look", desc: "Colors, typography, layout and avatar style", form: ["colors", "fonts", "template"], icon: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2zM6.5 12.5h.01M8.5 7.5h.01M13.5 6.5h.01M17.5 10.5h.01" },
  { id: "background", label: "Background", desc: "Card opacity, blur and background effects", form: ["bg"], icon: "M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21" },
  { id: "effects", label: "Effects", desc: "Name, bio and cursor effects", form: [], icon: "M12 3l1.9 5.8L20 10l-5 3.6L16.8 20 12 16.4 7.2 20 9 13.6 4 10l6.1-1.2z" },
  { id: "music", label: "Music", desc: "Profile track, playlist style and cursor", form: ["audio"], icon: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { id: "links", label: "Links", desc: "Your profile link and domain", form: [], icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
  { id: "widgets", label: "Widgets", desc: "Discord, Spotify, games and social links", form: [], icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { id: "badges", label: "Badges", desc: "Choose and order the badges you show", form: [], icon: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12" },
  { id: "aliases", label: "Aliases", desc: "Extra names that lead to this page", form: [], icon: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" },
  { id: "bestfriend", label: "Best Friend", desc: "Feature one profile on your page", form: [], icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" },
  { id: "sharing", label: "Sharing", desc: "Share your page anywhere", form: [], icon: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" },
  { id: "skills", label: "Skills", desc: "Show what you're good at", form: [], icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
];
