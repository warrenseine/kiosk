import * as path from "path";
import isInstalling from "electron-squirrel-startup";
import log from "electron-log";
import { app as electron } from "electron";
import { KioskServer } from "./KioskServer";
import { TypeSafeExpress } from "./TypeSafeExpress";
import { buildDatabase, StorageBackend } from "../shared/Database";
import { KioskWindowManager } from "./KioskWindowManager";
import { KioskApp } from "./KioskApp";
import { buildSystemDriver } from "./SystemDriver";

if (isInstalling) {
  electron.quit();
} else {
  // Log
  Object.assign(console, log.functions);
  log.catchErrors({ showDialog: false });

  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`Resource directory: ${process.resourcesPath}`);
  console.log(`User data directory: ${electron.getPath("userData")}`);

  // Database
  const dbPath = path.join(
    electron.isPackaged ? electron.getPath("userData") : process.cwd(),
    "kiosk.json"
  );
  console.log(`Database: ${dbPath}`);
  const database = buildDatabase(StorageBackend.File, dbPath);
  const port = database.getPort();

  // OS driver
  const systemDriver = buildSystemDriver(electron);
  const host = systemDriver.getHostName();

  // Window manager
  const baseUrl = electron.isPackaged
    ? `file://${process.resourcesPath}/app/build/index.html`
    : `http://localhost:3000`;
  console.log(`Base URL: ${baseUrl}`);

  const adminUrl = `${baseUrl}?host=${host}&port=${port}&mode=admin`;
  const overlayUrl = `${baseUrl}?host=${host}&port=${port}&mode=overlay`;

  const windowManager = new KioskWindowManager(
    electron,
    database,
    systemDriver,
    adminUrl,
    overlayUrl
  );

  // Web server
  const publicDir = path.join(
    electron.isPackaged ? process.resourcesPath : process.cwd(),
    "public"
  );
  console.log(`Public directory: ${publicDir}`);
  const express = new TypeSafeExpress(publicDir);
  const server = new KioskServer(
    port,
    express,
    database,
    systemDriver,
    windowManager
  );

  // App
  const kioskApp = new KioskApp(electron, windowManager, server);
  kioskApp.start();
}
