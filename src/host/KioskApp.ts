import fs from "fs";
import os from "os";
import { App, Menu, Tray } from "electron";
import { KioskWindowManager } from "./KioskWindowManager";
import { KioskServer } from "./KioskServer";

export class KioskApp {
  private tray: Tray = null;

  constructor(
    private electron: App,
    private windowManager: KioskWindowManager,
    private server: KioskServer
  ) {}

  start() {
    this.server.start();
    this.server.on("error", error => {
      console.error(error);

      if (error.code === "EADDRINUSE") {
        this.exit();
      }
    });

    this.electron.on("ready", () => this.setup());
    this.electron.on("window-all-closed", () => {
      // Listener required to keep the application alive.
    });

    process.on("SIGINT", () => this.exit());
  }

  setup() {
    Menu.setApplicationMenu(null);

    this.windowManager.createAdminWindow();
    this.windowManager.createOverlayWindow();

    let iconPath = `public/images/icons/icon.${
      os.platform() == "win32" ? "ico" : "png"
    }`;

    if (this.electron.isPackaged) {
      iconPath = `${process.resourcesPath}/app/${iconPath}`;
    }

    this.tray = new Tray(iconPath);
    this.tray.setToolTip("Kiosk");
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Configure",
          type: "normal",
          click: () =>
            this.windowManager.closeOverlayWindow() &&
            this.windowManager.showAdminWindow()
        },
        {
          label: "Hide",
          type: "normal",
          click: () =>
            this.windowManager.hideAdminWindow() &&
            this.windowManager.createOverlayWindow()
        },
        { type: "separator" },
        { label: "Quit Kiosk", type: "normal", click: () => this.quit() }
      ])
    );
  }

  exit(code = 1) {
    this.electron.exit(code);
  }

  quit() {
    // Force close the admin window, because "close" events are prevented, so the app can go to tray.
    this.windowManager.closeAdminWindow(true);
    this.electron.quit();
  }
}
