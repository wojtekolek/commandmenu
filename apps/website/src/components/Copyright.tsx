import type { FunctionComponent } from "react";
import { Heart } from "./Heart";

export const Copyright: FunctionComponent = () => (
  <div className="flex items-center justify-center gap-1 py-10 text-primary-400">
    Made with
    <span className="mx-1">
      <Heart />
    </span>
    by
    <a href="https://wojtekolek.com" className="text-primary-900">
      Wojtek Olek
    </a>
  </div>
);
