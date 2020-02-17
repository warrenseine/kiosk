/// <reference types="react-scripts" />

declare module "react-textfit" {
  import { FC } from "react";

  interface TextfitOptions {
    mode: string;
  }

  export const Textfit: FC<TextfitOptions>;
}
