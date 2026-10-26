import type { CSSProperties, ReactNode } from "react";

export type LogoItem =
  | { node: ReactNode; title?: string; href?: string; ariaLabel?: string; hoverColor?: string }
  | { src: string; alt?: string; title?: string; href?: string; width?: number; height?: number; hoverColor?: string };

export interface LogoLoopProps {
  logos: LogoItem[];
  speed?: number;
  direction?: "left" | "right" | "up" | "down";
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutWidth?: number;
  scaleOnHover?: boolean;
  layout?: string;
  bend?: number;
  focus?: number;
  magnify?: number;
  tiltX?: number;
  tiltY?: number;
  step?: boolean;
  muted?: number;
  labels?: "none" | "hover" | "inline" | "below";
  draggable?: boolean;
  scrollBoost?: number;
  intro?: boolean;
  renderItem?: (item: LogoItem, key: string) => ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export declare const LogoLoop: (props: LogoLoopProps) => ReactNode;
export default LogoLoop;
