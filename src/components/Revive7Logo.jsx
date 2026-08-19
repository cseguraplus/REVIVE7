import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/7874b7b43_Logorevive7BySerVivo.png";

export default function Revive7Logo({ size = "md", dark = false }) {
  const sizes = {
    sm: "h-7",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  return (
    <img
      src={LOGO_URL}
      alt="Revive 7 by Ser Vivo"
      className={`${sizes[size]} w-auto object-contain`}
      style={dark ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}