"use client";

import { Plus } from "pixelarticons/react";
import { useState } from "react";
import { addWorld } from "@/app/(app)/roadmap/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import { WorldForm } from "./WorldForm";

/** "Add a world" button that opens the form at the end of the map. */
export function AddWorld() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <PixelButton color="dark" onClick={() => setOpen(true)}>
        <Plus /> Add a world
      </PixelButton>
    );
  }

  return (
    <section className="border-2 border-dashed border-line bg-panel p-5">
      <h3 className="mb-4 font-display text-sm text-cyan uppercase">New world</h3>
      <WorldForm action={addWorld} submitLabel="Add world" onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </section>
  );
}
