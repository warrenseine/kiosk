import uuid from "uuid";
import { DeepPartial } from "redux";
import { KioskConfig } from "../shared/KioskConfig";
import { Database, StorageBackend, buildDatabase } from "../shared/Database";
import { HttpResponse } from "../shared/Operation";
import { ScreenshotData } from "../shared/ScreenshotData";
import { KioskDisplay } from "../shared/KioskDisplay";
import { Toggle } from "../shared/Toggle";
import { KioskWindow } from "../shared/KioskWindow";
import { AutoLoginRequest } from "../shared/AutoLogin";
import { kioskParams } from "./KioskParams";

class Warning extends Error {}

const validateResponse = async <O>(response: Response): Promise<O> => {
  if (!response.ok) {
    return Promise.reject(new Error("Request failed"));
  }

  const body: HttpResponse<O> = await response.json();

  if (response.status !== 200 || !body.success) {
    return Promise.reject(
      new Error(
        `Incorrect response status (${response.status}). ` +
          `Response was: ${JSON.stringify(response)}`
      )
    );
  }

  return body.payload;
};

export interface IKioskClient {
  readAutoLaunch(): Promise<Toggle>;
  updateAutoLaunch(toggle: Toggle): Promise<boolean>;
  readAutoLogin(): Promise<Toggle>;
  updateAutoLogin(request: AutoLoginRequest): Promise<boolean>;
  deleteAutoLogin(): Promise<boolean>;
  readKioskConfig(): Promise<KioskConfig>;
  updateKioskConfig(kioskConfig: DeepPartial<KioskConfig>): Promise<boolean>;
  createKioskWindow(): Promise<KioskWindow>;
  deleteKioskWindow(window: KioskWindow): Promise<boolean>;
  updateKioskWindow(window: KioskWindow): Promise<boolean>;
  captureWindow(id: string): Promise<ScreenshotData>;
  readDisplays(): Promise<KioskDisplay[]>;
  open(): Promise<boolean>;
  restart(): Promise<boolean>;
  refresh(): Promise<boolean>;
}

const buildKioskClientFromCurrentHost = (): IKioskClient => {
  if (kioskParams.host === "localhost") {
    return new FakeKioskClient();
  }

  return new KioskClient();
};

export class KioskClient implements IKioskClient {
  private async request<I, O>(
    path: string,
    method: string,
    input?: I
  ): Promise<O> {
    const response = await fetch(
      `http://${kioskParams.host}:${kioskParams.port}/${path}`,
      {
        method,
        body: input ? JSON.stringify(input) : undefined,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    return validateResponse(response);
  }

  private get<O>(path: string): Promise<O> {
    return this.request(path, "GET");
  }

  private post<I, O>(path: string, input?: I): Promise<O> {
    return this.request(path, "POST", input);
  }

  private put<I>(path: string, input?: I): Promise<boolean> {
    return this.request(path, "PUT", input);
  }

  private delete<I>(path: string, input?: I): Promise<boolean> {
    return this.request(path, "DELETE", input);
  }

  readAutoLaunch(): Promise<Toggle> {
    return this.get<Toggle>("api/auto-launch");
  }

  updateAutoLaunch(toggle: Toggle): Promise<boolean> {
    return this.put("api/auto-launch", toggle);
  }

  readAutoLogin(): Promise<Toggle> {
    return this.get<Toggle>("api/auto-login");
  }

  updateAutoLogin(request: AutoLoginRequest): Promise<boolean> {
    return this.put("api/auto-login", request);
  }

  deleteAutoLogin(): Promise<boolean> {
    return this.delete("api/auto-login");
  }

  readKioskConfig(): Promise<KioskConfig> {
    return this.get<KioskConfig>("api/kiosk-config");
  }

  updateKioskConfig(config: DeepPartial<KioskConfig>): Promise<boolean> {
    return this.put("api/kiosk-config", config);
  }

  createKioskWindow(): Promise<KioskWindow> {
    return this.post<undefined, KioskWindow>("api/window");
  }

  deleteKioskWindow(window: KioskWindow): Promise<boolean> {
    return this.delete("api/window", window);
  }

  updateKioskWindow(window: KioskWindow): Promise<boolean> {
    return this.put("api/window", window);
  }

  captureWindow(id: string): Promise<ScreenshotData> {
    return this.get<ScreenshotData>(`api/window/${id}/capture`);
  }

  open(): Promise<boolean> {
    return this.post<undefined, boolean>("api/open");
  }

  restart() {
    return this.post<undefined, boolean>("api/restart");
  }

  refresh() {
    return this.post<undefined, boolean>("api/refresh");
  }

  readDisplays() {
    return this.get<KioskDisplay[]>("api/displays");
  }
}

export class FakeKioskClient implements IKioskClient {
  private database: Database = buildDatabase(StorageBackend.LocalStorage);

  readAutoLaunch(): Promise<Toggle> {
    return Promise.resolve({ enabled: false });
  }

  updateAutoLaunch(toggle: Toggle): Promise<boolean> {
    return Promise.resolve(false);
  }

  readAutoLogin(): Promise<Toggle> {
    return Promise.resolve({ enabled: false });
  }

  updateAutoLogin(request: AutoLoginRequest): Promise<boolean> {
    return Promise.resolve(true);
  }

  deleteAutoLogin(): Promise<boolean> {
    return Promise.resolve(true);
  }

  readKioskConfig(): Promise<KioskConfig> {
    return Promise.resolve(this.database.getConfig());
  }

  updateKioskConfig(config: DeepPartial<KioskConfig>): Promise<boolean> {
    this.database.setConfig(config);
    return Promise.resolve(true);
  }

  createKioskWindow(): Promise<KioskWindow> {
    const newWindow = FakeKioskClient.doCreateKioskWindow();
    this.database.addWindow(newWindow);
    return Promise.resolve(newWindow);
  }

  deleteKioskWindow(window: KioskWindow): Promise<boolean> {
    this.database.removeWindow(window);
    return Promise.resolve(true);
  }

  updateKioskWindow(window: KioskWindow): Promise<boolean> {
    this.database.updateWindow(window);
    return Promise.resolve(true);
  }

  captureWindow(_: string): Promise<ScreenshotData> {
    return Promise.reject(
      new Warning("Not implemented in the stub: captureWindow")
    );
  }

  open(): Promise<boolean> {
    return Promise.reject(new Error("Not implemented in the stub: open"));
  }

  restart(): Promise<boolean> {
    return Promise.reject("Not implemented in the stub: restart");
  }

  refresh(): Promise<boolean> {
    return Promise.reject("Not implemented in the stub: refresh");
  }

  readDisplays(): Promise<KioskDisplay[]> {
    return Promise.resolve([{ id: 1, width: 1920, height: 1080, x: 0, y: 0 }]);
  }

  private static doCreateKioskWindow(): KioskWindow {
    const potentialNames = ["My window", undefined, "Top TV"];
    return {
      id: uuid(),
      name: potentialNames[Math.floor(Math.random() * potentialNames.length)],
      urls: [
        "https://c.xkcd.com/random/comic/",
        "https://theoatmeal.com/feed/random"
      ],
      cycle: 5,
      display: 1,
      fullScreen: true,
      bounds: {
        width: 1920,
        height: 1080,
        x: 0,
        y: 0
      }
    };
  }
}

export const kioskClient = buildKioskClientFromCurrentHost();
