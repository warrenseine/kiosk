import React, { FC } from "react";
import { Admin } from "./Admin";
import { Overlay } from "./Overlay";
import { kioskParams } from "./KioskParams";

export const App: FC = () => {
  switch (kioskParams.mode) {
    case "overlay":
      return <Overlay />;
    case "admin":
    default:
      return <Admin />;
  }
};
