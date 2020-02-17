import { BrowserWindow, Rectangle, App } from "electron";
import { Database } from "../shared/Database";
import { SystemDriver } from "./SystemDriver";
import { KioskWindow } from "../shared/KioskWindow";
import { overlayWindowSize } from "../shared/Style";
import { ReadonlyDeep } from "type-fest";

interface BrowserWindowGroup {
  tabs: {
    [url: string]: BrowserWindow;
  };
  currentTab: number;
  cycle: number; // Number of ticks before rotating tabs (in practice, seconds).
}

interface BrowserWindowGroupMap {
  [kioskWindowId: string]: BrowserWindowGroup;
}

const IconPath = "public/images/icons/icon.ico";

export class KioskWindowManager {
  private overlayWindow: BrowserWindow = null;
  private adminWindow: BrowserWindow = null;
  private browserWindowGroups: BrowserWindowGroupMap = {};
  private ticks: number = 0;

  constructor(
    private electron: App,
    private database: Database,
    private systemDriver: SystemDriver,
    private adminURL: string,
    private overlayURL: string
  ) {
    // Ticks are emitted every second.
    setInterval(() => this.tick(), 1000);

    console.log(`Debug: ${this.debugEnabled}`);
  }

  private get debugEnabled() {
    return this.database.getConfig().debug.enabled;
  }

  public createOverlayWindow() {
    if (this.overlayWindow) {
      return false;
    }

    this.hideAdminWindow();

    this.overlayWindow = new BrowserWindow({
      show: false,
      icon: IconPath,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      frame: false,
      transparent: true,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: false,
        allowRunningInsecureContent: true
      }
    });

    this.overlayWindow.loadURL(this.overlayURL);

    this.overlayWindow.webContents.once("dom-ready", () => {
      const primaryDisplay = this.systemDriver.getPrimaryDisplay();

      this.overlayWindow.setContentBounds({
        width: overlayWindowSize.width,
        height: overlayWindowSize.height,
        x: primaryDisplay.width - overlayWindowSize.width - 24,
        y: primaryDisplay.height - overlayWindowSize.height - 64
      });

      this.showOverlayWindow();
    });

    this.overlayWindow.on("closed", () => {
      // Due to a bug in Electron, transparent frameless windows will flash when shown after being hidden. As it doesn't
      // happen on the first appearance, we close instead of hiding the overlay window.
      this.overlayWindow = null;
    });

    return true;
  }

  public createAdminWindow() {
    if (this.adminWindow) {
      return false;
    }

    this.hideOverlayWindow();

    const debug = this.debugEnabled;

    this.adminWindow = new BrowserWindow({
      show: false,
      icon: IconPath,
      minimizable: false,
      alwaysOnTop: !debug,
      ...this.getOptimalWindowBounds(),
      webPreferences: {
        webSecurity: false,
        nodeIntegration: false,
        allowRunningInsecureContent: true
      }
    });

    this.adminWindow.loadURL(this.adminURL);

    if (debug && !this.electron.isPackaged) {
      // See https://github.com/electron/electron/issues/20069#issuecomment-586642795
      const devTools = new BrowserWindow();
      this.adminWindow.webContents.setDevToolsWebContents(devTools.webContents);
    }

    this.adminWindow.webContents.once("dom-ready", () => {
      if (debug) {
        this.adminWindow.webContents.openDevTools({ mode: "undocked" });
      }

      this.refresh();
    });

    this.adminWindow.on("close", event => {
      event.preventDefault();
      this.hideAdminWindow();
      this.createOverlayWindow();
    });

    return true;
  }

  private createBrowserWindow(
    browserWindowGroup: BrowserWindowGroup,
    fullScreen: boolean,
    bounds: Rectangle,
    title: string,
    url: string
  ) {
    const debug = this.debugEnabled;

    const browserWindow = new BrowserWindow({
      show: false,
      movable: debug,
      resizable: debug,
      frame: debug,
      fullscreen: fullScreen && !debug,
      kiosk: fullScreen && !debug,
      title,
      icon: IconPath,
      ...bounds,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: false,
        allowRunningInsecureContent: true
      }
    });

    browserWindow.webContents.once("dom-ready", () => {
      if (debug) {
        browserWindow.webContents.openDevTools();
      }

      this.updateBrowserWindow(browserWindow, fullScreen && !debug, bounds);
      this.injectScript(browserWindow);
    });

    browserWindow.on("closed", () => {
      delete browserWindowGroup.tabs[url];
    });

    browserWindow.on("page-title-updated", event => {
      event.preventDefault();
    });

    browserWindow.loadURL(url);

    return browserWindow;
  }

  private getOptimalWindowBounds(): Rectangle {
    const ratio = 0.75;
    const { width, height } = this.systemDriver.getPrimaryDisplay();
    const [optimalWidth, optimalHeight] = [width, height].map(n => n * ratio);
    const [xOffset, yOffset] = [width, height].map(n => (1 - ratio) / 2);

    return {
      width: optimalWidth,
      height: optimalHeight,
      x: xOffset,
      y: yOffset
    };
  }

  public hideOverlayWindow() {
    return this.toggleWindow(this.overlayWindow, false);
  }

  public hideAdminWindow() {
    return this.toggleWindow(this.adminWindow, false);
  }

  public showOverlayWindow() {
    return this.toggleWindow(this.overlayWindow, true);
  }

  public showAdminWindow() {
    return this.toggleWindow(this.adminWindow, true);
  }

  private toggleWindow(window: BrowserWindow, visible: boolean) {
    if (window) {
      if (visible) {
        window.show();
      } else {
        window.hide();
      }

      return true;
    }

    return false;
  }

  public closeOverlayWindow(force: boolean = false) {
    return this.closeWindow(this.overlayWindow, force);
  }

  public closeAdminWindow(force: boolean = false) {
    return this.closeWindow(this.adminWindow, force);
  }

  private closeWindow(window: BrowserWindow, force: boolean) {
    if (window) {
      if (force) {
        window.destroy();
      } else {
        window.close();
      }

      return true;
    }

    return false;
  }

  public closeAllWindows() {
    for (const [kioskWindowId, browserWindowGroup] of Object.entries(
      this.browserWindowGroups
    )) {
      this.deleteWindowGroup(browserWindowGroup, kioskWindowId);
    }
  }

  private deleteWindowGroup(
    browserWindowGroup: BrowserWindowGroup,
    kioskWindowId: string
  ) {
    for (const url of Object.keys(browserWindowGroup.tabs)) {
      this.deleteBrowserWindow(browserWindowGroup, url);
    }

    delete this.browserWindowGroups[kioskWindowId];
  }

  private updateBrowserWindow(
    browserWindow: BrowserWindow,
    fullScreen: boolean,
    bounds: Rectangle
  ) {
    const debug = this.debugEnabled;

    setTimeout(() => {
      browserWindow.setFullScreen(fullScreen && !debug);
      browserWindow.setKiosk(fullScreen && !debug);
      browserWindow.setBounds({ ...bounds });
      browserWindow.show();
    }, 0);
  }

  private deleteBrowserWindow(
    browserWindowGroup: BrowserWindowGroup,
    url: string
  ) {
    browserWindowGroup.tabs[url].destroy();
    delete browserWindowGroup.tabs[url];
  }

  private findWindowGroup(id: string): BrowserWindowGroup | undefined {
    return this.browserWindowGroups[id];
  }

  private findActiveWindow(id: string): BrowserWindow | undefined {
    const browserWindowGroup = this.findWindowGroup(id);

    if (!browserWindowGroup) {
      return undefined;
    }

    const iterableBrowserWindows = Object.values(browserWindowGroup.tabs);

    return iterableBrowserWindows[browserWindowGroup.currentTab];
  }

  public cycleWindow(browserWindowGroup: BrowserWindowGroup): void {
    const iterableBrowserWindows = Object.values(browserWindowGroup.tabs);

    if (iterableBrowserWindows.length === 0) {
      return;
    }

    browserWindowGroup.currentTab =
      (browserWindowGroup.currentTab + 1) % iterableBrowserWindows.length;

    const browserWindow = iterableBrowserWindows[browserWindowGroup.currentTab];
    browserWindow.moveTop();
  }

  public async captureWindow(id: string): Promise<string> {
    const window = this.findActiveWindow(id);

    if (!window) {
      throw new Error(`No window with ID ${id}`);
    }

    const image = await window.capturePage();

    if (image.isEmpty()) {
      throw new Error(
        `Screenshot capture of window with ID ${id} returned an empty image`
      );
    }

    const imageDataUrl = image.resize({ width: 300 }).toDataURL();
    return imageDataUrl;
  }

  private injectScript(browserWindow: BrowserWindow) {
    const injectScript = this.database.getConfig().injectScript;

    if (injectScript.enabled && injectScript.code) {
      // Yeah. Pretty unsafe.
      browserWindow.webContents.executeJavaScript(injectScript.code);
    }
  }

  public refresh(): void {
    const debug = this.debugEnabled;

    const kioskWindows: {
      [windowId: string]: ReadonlyDeep<KioskWindow>;
    } = Object.fromEntries(this.database.getWindows().map(w => [w.id, w]));

    const validWindowIds = new Set(Object.keys(kioskWindows));

    for (const kioskWindow of Object.values(kioskWindows)) {
      const {
        id,
        name,
        cycle,
        fullScreen,
        display,
        urls,
        bounds
      } = kioskWindow;
      let browserWindowGroup = this.findWindowGroup(id);

      if (browserWindowGroup) {
        browserWindowGroup.cycle = cycle;
      } else {
        // Create window group.
        browserWindowGroup = {
          tabs: {},
          currentTab: 0,
          cycle
        };

        this.browserWindowGroups[id] = browserWindowGroup;
      }

      for (const url of urls) {
        let browserWindow = browserWindowGroup.tabs[url];

        const kioskDisplay = this.systemDriver.getDisplay(display);
        const finalBounds: Rectangle = {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x + (kioskDisplay ? kioskDisplay.x : 0),
          y: bounds.y + (kioskDisplay ? kioskDisplay.y : 0)
        };

        if (!browserWindow) {
          // Add created windows.
          browserWindow = this.createBrowserWindow(
            browserWindowGroup,
            fullScreen && !debug,
            finalBounds,
            name,
            url
          );

          browserWindowGroup.tabs[url] = browserWindow;
        }

        this.updateBrowserWindow(
          browserWindow,
          fullScreen && !debug,
          finalBounds
        );
      }
    }

    for (const [kioskWindowId, browserWindowGroup] of Object.entries(
      this.browserWindowGroups
    )) {
      if (validWindowIds.has(kioskWindowId)) {
        const kioskWindow = kioskWindows[kioskWindowId];
        for (const url of Object.keys(browserWindowGroup.tabs)) {
          if (!kioskWindow.urls.includes(url)) {
            // Remove deleted windows.
            this.deleteBrowserWindow(browserWindowGroup, url);
          }
        }
      } else {
        // Remove deleted window groups.
        this.deleteWindowGroup(browserWindowGroup, kioskWindowId);
      }
    }
  }

  private tick() {
    const debug = this.database.getConfig().debug.enabled;

    this.ticks++;

    if (debug) {
      return;
    }

    for (const browserWindowGroup of Object.values(this.browserWindowGroups)) {
      if (
        browserWindowGroup.cycle > 0 &&
        this.ticks % browserWindowGroup.cycle === 0
      ) {
        this.cycleWindow(browserWindowGroup);
      }
    }
  }
}
