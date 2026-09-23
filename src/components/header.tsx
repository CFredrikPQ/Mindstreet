"use client";

import { useEffect, useState } from "react";
import { menuItems } from "@/content/home";

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="site-header">
      <a href="#top" className="logo-link">
        <img src="/icons/logo.svg" width={239} height={46} alt="Mindstreet" />
      </a>
      <button
        type="button"
        className="menu-button"
        aria-label="Öppna meny"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <img src="/icons/menu.svg" width={37.41} height={32} alt="" />
      </button>

      {open ? (
        <div className="menu-layer">
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Stäng meny"
            onClick={() => setOpen(false)}
          />
          <nav className="menu-panel" aria-label="Huvudmeny">
            <button
              type="button"
              className="menu-close"
              aria-label="Stäng meny"
              onClick={() => setOpen(false)}
            >
              <span />
              <span />
            </button>
            <ul>
              {menuItems.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <a href={item.href} onClick={() => setOpen(false)}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
