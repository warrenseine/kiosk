export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KioskWindow {
  id: string;
  name?: string;
  urls: string[];
  fullScreen: boolean;
  bounds: Rectangle;
  display: number;
  cycle: number;
}
