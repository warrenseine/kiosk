import isAdmin from "is-admin";
import { v4 as uuid } from "uuid";
import { KioskConfig } from "../shared/KioskConfig";
import { AutoLoginRequest } from "../shared/AutoLogin";
import { Toggle } from "../shared/Toggle";
import { ScreenshotData } from "../shared/ScreenshotData";
import { KioskDisplay } from "../shared/KioskDisplay";
import { Database } from "../shared/Database";
import {
  TypeSafeExpress,
  ErrnoException,
  ok,
  fail,
  useParams
} from "./TypeSafeExpress";
import { SystemDriver } from "./SystemDriver";
import { KioskWindowManager } from "./KioskWindowManager";
import { KioskWindow } from "../shared/KioskWindow";

export class KioskServer {
  constructor(
    private port: number,
    private server: TypeSafeExpress,
    database: Database,
    systemDriver: SystemDriver,
    windowManager: KioskWindowManager
  ) {
    server.serve("/", "index.html");

    server.get<Toggle>("/api/auto-login", async () => {
      const enabled = await systemDriver.isAutoLoginEnabled();

      return ok({
        enabled,
        valid: enabled // Checked when setting the value.
      });
    });

    server.delete("/api/auto-login", async () => {
      await systemDriver.deleteAutoLogin();
      return ok();
    });

    server.put<AutoLoginRequest>(
      "/api/auto-login",
      async ({ enabled, credentials }: AutoLoginRequest) => {
        if (!isAdmin()) {
          return fail(401, "User must be administrator");
        }

        if (!enabled) {
          await systemDriver.disableAutoLogin();

          return ok();
        }

        if (!credentials) {
          return fail(422, "Expected keys in request: credentials");
        }

        if (!credentials.userName || !credentials.password) {
          return fail(
            422,
            "Expected keys in request: credentials.userName, credentials.password"
          );
        }

        const success = await systemDriver.setAutoLogin(credentials);

        if (!success) {
          return fail(401, "Invalid credentials");
        }

        return ok();
      }
    );

    server.get<Toggle>("/api/auto-launch", async () => {
      return ok({
        enabled: systemDriver.isAutoLaunchEnabled()
      });
    });

    server.put<Toggle>("/api/auto-launch", async ({ enabled }: Toggle) => {
      if (enabled === undefined) {
        return fail(422, "Expected keys in request: enabled");
      }

      systemDriver.setAutoLaunch(enabled);

      return ok();
    });

    server.get<KioskConfig>("/api/kiosk-config", async () =>
      ok(database.getConfig())
    );

    server.put<KioskConfig>(
      "/api/kiosk-config",
      async (config: KioskConfig) => {
        database.setConfig(config);

        return ok();
      }
    );

    server.post<void>("/api/restart", async () => {
      systemDriver.restart();

      return ok();
    });

    server.post<void>("/api/relaunch", async () => {
      systemDriver.relaunch();

      return ok();
    });

    server.post<void>("/api/refresh", async () => {
      windowManager.closeAllWindows();

      await new Promise((resolve: () => void) =>
        setTimeout(() => {
          windowManager.refresh();
          resolve();
        }, 1000)
      );

      return ok();
    });

    server.post<KioskWindow>("/api/window", async () => {
      const { id, ...bounds } = systemDriver.getPrimaryDisplay();
      const newWindow: KioskWindow = {
        id: uuid(),
        name: undefined,
        urls: [],
        cycle: 30,
        display: id,
        fullScreen: true,
        bounds
      };

      database.addWindow(newWindow);
      windowManager.refresh();

      return ok(newWindow);
    });

    server.put<KioskWindow>("/api/window", async (window: KioskWindow) => {
      database.updateWindow(window);
      windowManager.refresh();

      return ok();
    });

    server.delete<KioskWindow>("/api/window", async (window: KioskWindow) => {
      database.removeWindow(window);
      windowManager.refresh();

      return ok();
    });

    server.get<ScreenshotData>("/api/window/:id/capture", async () => {
      const { id } = useParams();

      const imageDataUrl = await windowManager.captureWindow(id);

      return ok({
        dataUri: imageDataUrl,
        date: new Date().toUTCString()
      });
    });

    server.get<KioskDisplay[]>("/api/displays", async () => {
      return ok(systemDriver.getDisplays());
    });

    server.post<boolean>("/api/open", async () =>
      ok(windowManager.closeOverlayWindow() && windowManager.showAdminWindow())
    );
  }

  start() {
    this.server.listen(this.port);
  }

  on(event: "error", listener: (error: ErrnoException) => void) {
    this.server.on(event, listener);
  }
}
