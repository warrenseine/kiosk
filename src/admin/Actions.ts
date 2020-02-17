import { createAsyncAction } from "redux-promise-middleware-actions";
import { KioskConfig } from "../shared/KioskConfig";
import { kioskClient } from "./KioskClient";
import { DeepPartial } from "redux";
import { KioskWindow } from "../shared/KioskWindow";
import { AutoLoginRequest, AutoLoginStatus } from "../shared/AutoLogin";

export const createKioskWindow = createAsyncAction("CREATE_WINDOW", () =>
  kioskClient.createKioskWindow()
);

export const updateKioskWindow = createAsyncAction(
  "UPDATE_WINDOW",
  (window: KioskWindow) =>
    kioskClient.updateKioskWindow(window).then(_ => window)
);

export const deleteKioskWindow = createAsyncAction(
  "DELETE_WINDOW",
  (window: KioskWindow) =>
    kioskClient.deleteKioskWindow(window).then(_ => window)
);

export const captureWindowScreenshot = createAsyncAction(
  "CAPTURE_WINDOW_SCREENSHOT",
  (window: KioskWindow) =>
    kioskClient
      .captureWindow(window.id)
      .then(screenshotData => [screenshotData, window] as const)
);

export const readAutoLaunch = createAsyncAction("READ_AUTO_LAUNCH", () =>
  kioskClient.readAutoLaunch()
);

export const updateAutoLaunch = createAsyncAction(
  "UPDATE_AUTO_LAUNCH",
  (enabled: boolean) =>
    kioskClient.updateAutoLaunch({ enabled }).then(_ => ({ enabled }))
);

export const readKioskConfig = createAsyncAction("READ_CONFIG", () =>
  kioskClient.readKioskConfig()
);

export const updateKioskConfig = createAsyncAction(
  "UPDATE_CONFIG",
  (config: DeepPartial<KioskConfig>) =>
    kioskClient.updateKioskConfig(config).then(_ => config)
);

export const readAutoLogin = createAsyncAction("READ_AUTO_LOGIN", () =>
  kioskClient.readAutoLogin()
);

export const updateAutoLogin = createAsyncAction(
  "UPDATE_AUTO_LOGIN",
  (request: AutoLoginRequest) => {
    if (request.enabled && !request.credentials) {
      return Promise.resolve<AutoLoginStatus>({ enabled: request.enabled });
    }

    return kioskClient.updateAutoLogin(request).then((valid: boolean) => ({
      enabled: request.enabled,
      valid: request.enabled ? valid : undefined
    }));
  }
);

export const deleteAutoLogin = createAsyncAction("DELETE_AUTO_LOGIN", () =>
  kioskClient.deleteAutoLogin()
);

export const open = createAsyncAction("OPEN", () => kioskClient.open());

export const restart = createAsyncAction("RESTART", () =>
  kioskClient.restart()
);

export const refresh = createAsyncAction("REFRESH", () =>
  kioskClient.refresh()
);

export const readDisplays = createAsyncAction("READ_DISPLAYS", () =>
  kioskClient.readDisplays()
);
