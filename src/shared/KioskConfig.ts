import { Toggle } from "./Toggle";
import { KioskWindow } from "./KioskWindow";

export interface KioskConfig {
  version: number;
  port: number;
  debug: Toggle;
  windows: KioskWindow[];
  injectScript: Toggle & { code?: string };
}

export const KioskConfigDefault: KioskConfig = {
  version: 1,
  port: 8080,
  debug: {
    enabled: false
  },
  windows: [],
  injectScript: {
    enabled: false,
    code:
      "// Insert JavaScript code to inject in windows.\n" +
      "// See documentation for examples.\n"
  }
};
