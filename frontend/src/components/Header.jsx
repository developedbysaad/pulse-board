import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LiveDot } from "./ui";

export function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/login");
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="border-b-2 border-double border-ink/40 bg-paper">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-6 pb-3 pt-5">
        <div className="flex items-end gap-4">
          <Link to={user?.type === "admin" ? "/home" : "/"} aria-label="Pulse Board">
            <span className="block font-display text-3xl font-semibold leading-none tracking-tight text-ink">
              Pulse Board
            </span>
            <span className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              <LiveDot />
              The polling daily · {today}
            </span>
          </Link>
        </div>

        {user?.type === "admin" && (
          <nav className="flex items-center gap-6 pb-1">
            <NavLink
              to="/home"
              className={({ isActive }) =>
                `font-mono text-[11px] uppercase tracking-[0.22em] transition-colors ${
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink"
                }`
              }
            >
              Polls
            </NavLink>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint md:inline">
              {user.email || user.name}
            </span>
            <button
              onClick={handleLogout}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
