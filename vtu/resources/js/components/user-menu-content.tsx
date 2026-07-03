import { Link } from "@inertiajs/react";
import type { User } from "@/types";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserMenuContent({ user }: { user: User | null }) {
  return (
    <>
      <DropdownMenuLabel>
        <div className="flex flex-col">
          <span className="font-medium">{user?.name ?? "Account"}</span>
          <span className="text-xs text-muted-foreground">
            {user?.email ?? "Not signed in"}
          </span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/settings/profile">Profile settings</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/appearance">Appearance</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={() => {
          window.location.href = "/logout";
        }}
      >
        Log out
      </DropdownMenuItem>
    </>
  );
}
