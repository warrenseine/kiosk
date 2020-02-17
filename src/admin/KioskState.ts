import { ScreenshotData } from "../shared/ScreenshotData";
import { KioskDisplay } from "../shared/KioskDisplay";
import { Toggle } from "../shared/Toggle";
import { KioskConfig, KioskConfigDefault } from "../shared/KioskConfig";
import { AutoLoginStatus } from "../shared/AutoLogin";

export interface KioskState {
  pendingRequests: number;
  displays: KioskDisplay[];
  kioskConfig: KioskConfig;
  screenshots: {
    data: {
      [windowId: string]: ScreenshotData;
    };
    errors: Error[];
  };
  autoLogin: AutoLoginStatus;
  autoLaunch: Toggle;
}

export const initialState: KioskState = {
  pendingRequests: 0,
  displays: [],
  kioskConfig: KioskConfigDefault,
  screenshots: {
    data: {},
    errors: []
  },
  autoLogin: { enabled: false },
  autoLaunch: { enabled: false }
};
