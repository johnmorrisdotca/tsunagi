import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tsunagi-board": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { grid?: string; level?: string; set?: string; board?: string; marks?: string; lang?: string; theme?: string };
    }
  }
}
