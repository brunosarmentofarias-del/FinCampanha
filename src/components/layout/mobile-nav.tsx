"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavLinks } from "./nav-links";

export function MobileNav() {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="max-w-xs p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle>FinCampanha</DialogTitle>
        </DialogHeader>
        <NavLinks onNavigate={() => setAberto(false)} />
      </DialogContent>
    </Dialog>
  );
}
