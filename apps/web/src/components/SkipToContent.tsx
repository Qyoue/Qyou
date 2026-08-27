import React from "react";

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content"
      style={{
        position: "absolute",
        top: -100,
        left: 0,
        padding: 8,
        background: "#000",
        color: "#fff",
        zIndex: 100,
      }}
    >
      Skip to content
    </a>
  );
}
