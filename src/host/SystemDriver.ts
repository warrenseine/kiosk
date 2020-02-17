import os from "os";
import cp from "child_process";
import { App, Screen } from "electron";
import {
  putValue,
  list,
  RegistryKeys,
  RegistryValues,
  setExternalVBSLocation
} from "regedit";
import { promisify } from "util";
import { WindowsCredentials } from "../shared/AutoLogin";
import { KioskDisplay } from "../shared/KioskDisplay";

const regeditAsync = {
  put: promisify(putValue),
  list: promisify(list)
};

export interface SystemDriver {
  getHostName(): string;
  isAutoLoginEnabled(): Promise<boolean>;
  setAutoLogin(credentials: WindowsCredentials): Promise<boolean>;
  disableAutoLogin(): Promise<void>;
  deleteAutoLogin(): Promise<void>;
  isAutoLaunchEnabled(): boolean;
  setAutoLaunch(enabled: boolean): void;
  isRestartPending(): Promise<boolean>;
  getDisplays(): KioskDisplay[];
  getDisplay(id: number): KioskDisplay | undefined;
  getPrimaryDisplay(): KioskDisplay;
  relaunch(): void;
  restart(): void;
}

export const buildSystemDriver = (electron: App): SystemDriver => {
  switch (os.platform()) {
    case "win32":
      return new WindowsDriver(electron);
    case "darwin":
      return new MacOsDriver(electron);
  }

  throw new Error("Not implemented");
};

export class WindowsDriver implements SystemDriver {
  private screen: Screen = null;
  private scriptsPath: string = "scripts";

  constructor(private electron: App) {
    electron.on("ready", async () => {
      this.screen = require("electron").screen;

      if (await this.isAdminUser()) {
        console.log("Privilege: admin");
      } else {
        console.error(
          "Privilege: non-admin. The application should be run as Administrator."
        );
      }

      console.log("Electron is ready.");
    });

    if (electron.isPackaged) {
      const vbsDir = `${process.resourcesPath}/vbs`;
      console.log(`VBS: ${vbsDir}`);
      setExternalVBSLocation(vbsDir);

      this.scriptsPath = `${process.resourcesPath}/app/scripts`;
    }
  }

  static readonly WinLogonPath =
    "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon";
  static readonly AutoAdminLogonKey = "AutoAdminLogon";
  static readonly RebootPendingPath =
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending";

  getHostName(): string {
    return os.hostname();
  }

  async isAdminUser() {
    return new Promise<boolean>(resolve =>
      cp.exec("net session", (error: Error, stdout: string, stderr: string) => {
        resolve(stderr.length === 0);
      })
    );
  }

  async isAutoLoginEnabled() {
    const result: RegistryValues = await regeditAsync.list(
      WindowsDriver.WinLogonPath
    );
    return (
      result[WindowsDriver.WinLogonPath]?.values[
        WindowsDriver.AutoAdminLogonKey
      ]?.value === 1
    );
  }

  private async validateCredentials({
    userName,
    password
  }: WindowsCredentials): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const params = [
        `${this.scriptsPath}/validate-credentials.ps1`,
        "-userName",
        userName,
        "-password",
        password
      ];

      const errorChunks: string[] = [];
      const outputChunks: string[] = [];

      const powershell = cp.spawn("powershell.exe", params);
      powershell.on("exit", (code: number) => {
        if (errorChunks.length)
          console.error(errorChunks.join("").replace(password, "***"));
        if (outputChunks.length)
          console.error(outputChunks.join("").replace(password, "***"));
        resolve(code === 0);
      });
      powershell.stdout.on("data", data => outputChunks.push(data.toString()));
      powershell.stderr.on("data", data => errorChunks.push(data.toString()));
      powershell.stdin.end();
    });
  }

  async setAutoLogin(credentials: WindowsCredentials) {
    const success = await this.validateCredentials(credentials);

    if (!success) {
      return false;
    }

    let [domain, userName] = credentials.userName.split("\\");

    if (!userName) [userName, domain] = [domain, ""];

    const keys: RegistryKeys = {
      [WindowsDriver.WinLogonPath]: {
        AutoAdminLogon: {
          value: 1,
          type: "REG_DWORD"
        },
        DefaultDomainName: {
          value: domain,
          type: "REG_SZ"
        },
        DefaultUserName: {
          value: userName,
          type: "REG_SZ"
        },
        DefaultPassword: {
          value: credentials.password,
          type: "REG_SZ"
        }
      }
    };

    try {
      await regeditAsync.put(keys);
    } catch (error) {
      // Error can be a Buffer, hence the explicit `.toString()`.
      console.error(`setAutoLogin() failed: ${error.toString()}`);
      return false;
    }

    return true;
  }

  async disableAutoLogin() {
    const keys: RegistryKeys = {
      [WindowsDriver.WinLogonPath]: {
        AutoAdminLogon: {
          value: 0,
          type: "REG_DWORD"
        }
      }
    };

    await regeditAsync.put(keys);
  }

  async deleteAutoLogin() {
    const keys: RegistryKeys = {
      [WindowsDriver.WinLogonPath]: {
        AutoAdminLogon: {
          value: 0,
          type: "REG_DWORD"
        },
        DefaultDomainName: {
          value: "",
          type: "REG_SZ"
        },
        DefaultUserName: {
          value: "",
          type: "REG_SZ"
        },
        DefaultPassword: {
          value: "",
          type: "REG_SZ"
        }
      }
    };

    await regeditAsync.put(keys);
  }

  isAutoLaunchEnabled() {
    const { openAtLogin } = this.electron.getLoginItemSettings({
      path: this.electron.getPath("exe")
    });

    return openAtLogin;
  }

  setAutoLaunch(enabled: boolean) {
    this.electron.setLoginItemSettings({
      openAtLogin: enabled,
      path: this.electron.getPath("exe")
    });
  }

  async isRestartPending() {
    const result: RegistryValues = await regeditAsync.list(
      WindowsDriver.RebootPendingPath
    );
    return !!result[WindowsDriver.RebootPendingPath];
  }

  getDisplays(): KioskDisplay[] {
    if (!this.screen) {
      throw new Error("getDisplays called before application is ready");
    }

    return this.screen.getAllDisplays().map(({ id, bounds }) => ({
      id,
      ...bounds
    }));
  }

  getDisplay(id: number): KioskDisplay | undefined {
    return this.getDisplays().find(d => d.id === id);
  }

  getPrimaryDisplay(): KioskDisplay {
    if (!this.screen) {
      throw new Error("getDisplays called before application is ready");
    }

    const { id, bounds } = this.screen.getPrimaryDisplay();

    return {
      id,
      ...bounds
    };
  }

  relaunch() {
    this.electron.relaunch();
    this.electron.quit();
  }

  restart() {
    cp.exec("shutdown -r -t 0");
  }
}

export class MacOsDriver implements SystemDriver {
  private screen: Screen = null;

  constructor(private electron: App) {
    electron.on("ready", () => {
      this.screen = require("electron").screen;
    });
  }

  getHostName(): string {
    return `${os.hostname()}.local`;
  }

  isAutoLoginEnabled(): Promise<boolean> {
    return Promise.resolve(false);
  }

  setAutoLogin(credentials: WindowsCredentials): Promise<boolean> {
    return Promise.resolve(false);
  }

  disableAutoLogin(): Promise<void> {
    return Promise.resolve();
  }

  deleteAutoLogin(): Promise<void> {
    return Promise.resolve();
  }

  isAutoLaunchEnabled(): boolean {
    return false;
  }

  setAutoLaunch(enabled: boolean): void {
    throw new Error("Method not implemented.");
  }

  isRestartPending(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  getDisplays(): KioskDisplay[] {
    if (!this.screen) {
      throw new Error("getDisplays called before application is ready");
    }

    return this.screen.getAllDisplays().map(({ id, bounds }) => ({
      id,
      ...bounds
    }));
  }

  getDisplay(id: number): KioskDisplay | undefined {
    return this.getDisplays().find(d => d.id === id);
  }

  getPrimaryDisplay(): KioskDisplay {
    if (!this.screen) {
      throw new Error("getDisplays called before application is ready");
    }

    const { id, bounds } = this.screen.getPrimaryDisplay();

    return {
      id,
      ...bounds
    };
  }

  relaunch(): void {
    this.electron.relaunch();
    this.electron.quit();
  }

  restart(): void {
    throw new Error("Method not implemented.");
  }
}
