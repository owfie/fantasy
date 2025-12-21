"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const ICON_SIZE = 16;

  return (
    <div>
      <button onClick={() => setTheme("light")}>
        {theme === "light" ? (
          <Sun key="light" size={ICON_SIZE} />
        ) : theme === "dark" ? (
          <Moon key="dark" size={ICON_SIZE} />
        ) : (
          <Laptop key="system" size={ICON_SIZE} />
        )}
      </button>
      <div>
        <button onClick={() => setTheme("light")}>
          <Sun size={ICON_SIZE} /> Light
        </button>
        <button onClick={() => setTheme("dark")}>
          <Moon size={ICON_SIZE} /> Dark
        </button>
        <button onClick={() => setTheme("system")}>
          <Laptop size={ICON_SIZE} /> System
        </button>
      </div>
    </div>
  );
};

export { ThemeSwitcher };
