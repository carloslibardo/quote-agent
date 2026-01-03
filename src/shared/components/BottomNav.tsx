import { useNavigate, useLocation } from "react-router-dom";
import {
  UserCheck,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { NAV_ICON_SIZE } from "@/shared/constants/icons";

interface BottomNavProps {
  isAdmin?: boolean;
}

interface NavItem {
  path: string;
  icon?: LucideIcon;
  iconSrc?: string;
  label: string;
}

const BottomNav = ({ isAdmin }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/users") {
      // Active for /users and /users/:id
      return (
        location.pathname === "/users" ||
        location.pathname.startsWith("/users/")
      );
    }
    return location.pathname === path;
  };

  const navItems: NavItem[] = [
    { path: "/", iconSrc: "/logo-icon-white.png", label: "Home" },
    { path: "/users", icon: UserCheck, label: "Users" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: Shield, label: "Admin" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card z-50 safe-area-bottom">
      {/* Top divider */}
      <div className="h-px bg-border" />
      {/* Tabs container */}
      <div className="flex items-start w-full max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="basis-0 grow min-w-0 flex flex-col items-center justify-center pt-2 pb-4 gap-2"
            >
              {/* Icon container */}
              <div
                className={`${NAV_ICON_SIZE} overflow-hidden flex items-center justify-center`}
              >
                {item.iconSrc ? (
                  <img
                    src={item.iconSrc}
                    alt={item.label}
                    className="size-full"
                    style={{
                      opacity: active ? 1 : 0.55,
                    }}
                  />
                ) : Icon ? (
                  <Icon
                    className={`${NAV_ICON_SIZE} ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={1}
                  />
                ) : null}
              </div>
              {/* Label */}
              <span
                className={`text-xs leading-none text-center ${
                  active
                    ? "font-bold text-primary"
                    : "font-normal text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
