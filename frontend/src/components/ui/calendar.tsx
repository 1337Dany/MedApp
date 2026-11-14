"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

// src/index.css is a static Tailwind build, so only classes that exist in it are used here.
const NAV_BUTTON =
  "absolute top-0 flex items-center justify-center w-8 h-8 text-gray-700 border border-gray-300 rounded hover:bg-gray-50";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-4",
        caption: "relative flex items-center justify-center h-8 w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: NAV_BUTTON,
        nav_button_previous: "left-0",
        nav_button_next: "right-0",
        table: "w-full",
        head_row: "flex",
        head_cell: "w-8 text-xs font-medium text-gray-500",
        row: "flex w-full mt-2",
        cell: "relative text-center text-sm",
        // In the build, hover:bg-blue-700 comes after hover:bg-blue-100, so a hovered selected day stays dark.
        day: "w-8 h-8 rounded text-sm hover:bg-blue-100",
        day_selected: "bg-blue-600 text-white hover:bg-blue-700",
        day_today: "font-semibold text-blue-600",
        day_outside: "text-gray-400",
        day_disabled: "text-gray-400",
        day_hidden: "hidden",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("w-4 h-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("w-4 h-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
