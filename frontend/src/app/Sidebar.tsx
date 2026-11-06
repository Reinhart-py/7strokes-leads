"use client";

import React, { useEffect, useRef, useState } from "react";

export type NavChild = {
  key: string;
  label: string;
  onSelect: () => void;
  meta?: string;
};

export type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  badge?: string | number;
  children?: NavChild[];
};

type SidebarProps = {
  items: NavItem[];
  activeKey: string;
  pinned: boolean;
  onTogglePinned: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brand: React.ReactNode;
  brandMark: React.ReactNode;
  footer: (expanded: boolean) => React.ReactNode;
};

const RAIL_WIDTH = 76;
const FULL_WIDTH = 264;
const HOVER_OPEN_DELAY = 140;
const HOVER_CLOSE_DELAY = 220;

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const PanelIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
);

const groupOf = (items: NavItem[], key: string) =>
  items.find(i => i.key === key || i.children?.some(c => c.key === key))?.key || null;

function NavList({
  items,
  activeKey,
  expanded,
  hoverMode,
  onNavigate
}: {
  items: NavItem[];
  activeKey: string;
  expanded: boolean;
  hoverMode: boolean;
  onNavigate: () => void;
}) {
  const activeGroup = groupOf(items, activeKey);
  // Groups the user explicitly toggled; the active group is open by default.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  const isOpen = (key: string) => {
    if (!expanded) return false;
    if (hoverMode && hoverGroup) return hoverGroup === key || (toggled[key] ?? false);
    return toggled[key] ?? key === activeGroup;
  };

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map(item => {
        const hasChildren = !!item.children?.length;
        const open = hasChildren && isOpen(item.key);
        const groupActive = item.key === activeGroup;
        const selfActive = item.key === activeKey;

        return (
          <div
            key={item.key}
            onMouseEnter={() => hoverMode && hasChildren && setHoverGroup(item.key)}
          >
            <button
              type="button"
              title={expanded ? undefined : item.label}
              aria-expanded={hasChildren ? open : undefined}
              onClick={() => {
                if (hasChildren) {
                  setToggled(t => ({ ...t, [item.key]: !open }));
                  if (hoverMode) setHoverGroup(open ? null : item.key);
                } else if (item.onSelect) {
                  item.onSelect();
                  onNavigate();
                }
              }}
              className={`group relative w-full flex items-center gap-3 h-10 rounded-[10px] text-[13px] font-semibold transition-colors ${expanded ? "px-3" : "justify-center px-0"} ${
                selfActive || (groupActive && !open)
                  ? "bg-white/[0.09] text-white"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {(selfActive || groupActive) && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#12a594]" aria-hidden="true" />
              )}
              <span className={`shrink-0 ${selfActive || groupActive ? "text-[#12a594]" : ""}`}>{item.icon}</span>
              {expanded && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#12a594]/20 text-[#12a594] text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && <span className="text-white/50"><Chevron open={open} /></span>}
                </>
              )}
            </button>

            {hasChildren && (
              <div
                className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 invisible"}`}
              >
                <div className="overflow-hidden">
                  <ul className="ml-[22px] pl-3 border-l border-white/10 py-1 flex flex-col gap-0.5">
                    {item.children!.map(child => {
                      const active = child.key === activeKey;
                      return (
                        <li key={child.key}>
                          <button
                            type="button"
                            tabIndex={open ? 0 : -1}
                            onClick={() => { child.onSelect(); onNavigate(); }}
                            className={`w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12.5px] text-left transition-colors ${
                              active ? "bg-[#12a594]/15 text-[#12a594] font-semibold" : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                            }`}
                          >
                            <span className="flex-1 truncate">{child.label}</span>
                            {child.meta && <span className="text-[10px] text-white/40 tabular-nums shrink-0">{child.meta}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar({
  items,
  activeKey,
  pinned,
  onTogglePinned,
  mobileOpen,
  onCloseMobile,
  brand,
  brandMark,
  footer
}: SidebarProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => clearTimers, []);

  const expanded = pinned || hoverOpen;
  const hoverMode = !pinned && hoverOpen;

  const handleEnter = () => {
    if (pinned) return;
    clearTimers();
    // Small "hold" delay so passing the cursor across the rail doesn't flash it open.
    openTimer.current = setTimeout(() => setHoverOpen(true), HOVER_OPEN_DELAY);
  };

  const handleLeave = () => {
    if (pinned) return;
    clearTimers();
    closeTimer.current = setTimeout(() => setHoverOpen(false), HOVER_CLOSE_DELAY);
  };

  const panel = (isExpanded: boolean, isHoverMode: boolean, isMobile: boolean) => (
    <div className="crm-sidebar h-full flex flex-col text-white">
      <div className={`h-16 shrink-0 flex items-center gap-2 border-b border-white/[0.07] ${isExpanded ? "px-4 justify-between" : "justify-center"}`}>
        {isExpanded ? <div className="min-w-0">{brand}</div> : brandMark}
        {isExpanded && (
          <button
            type="button"
            onClick={isMobile ? onCloseMobile : onTogglePinned}
            className="w-8 h-8 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.06] inline-flex items-center justify-center shrink-0"
            title={isMobile ? "Close menu" : pinned ? "Collapse sidebar" : "Keep sidebar open"}
            aria-label={isMobile ? "Close menu" : pinned ? "Collapse sidebar" : "Keep sidebar open"}
          >
            <PanelIcon />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${isExpanded ? "px-3" : "px-2.5"}`}>
        <NavList
          items={items}
          activeKey={activeKey}
          expanded={isExpanded}
          hoverMode={isHoverMode}
          onNavigate={() => {
            if (isMobile) onCloseMobile();
            if (isHoverMode) { clearTimers(); setHoverOpen(false); }
          }}
        />
      </div>

      <div className={`shrink-0 border-t border-white/[0.07] ${isExpanded ? "p-3" : "p-2.5"}`}>{footer(isExpanded)}</div>
    </div>
  );

  return (
    <>
      {/* Desktop: the outer box reserves layout space; the inner panel can grow over the page on hover. */}
      <div
        className="hidden md:block relative shrink-0 h-screen transition-[width] duration-200 ease-out"
        style={{ width: pinned ? FULL_WIDTH : RAIL_WIDTH }}
      >
        <aside
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className={`absolute inset-y-0 left-0 z-40 overflow-hidden transition-[width,box-shadow] duration-200 ease-out ${hoverMode ? "shadow-[12px_0_40px_-12px_rgba(11,42,74,0.55)]" : ""}`}
          style={{ width: expanded ? FULL_WIDTH : RAIL_WIDTH }}
        >
          <div className="h-full" style={{ width: expanded ? FULL_WIDTH : RAIL_WIDTH }}>
            {panel(expanded, hoverMode, false)}
          </div>
        </aside>
      </div>

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-0 z-50 ${mobileOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-[#0b2a4a]/45 transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onCloseMobile}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[284px] max-w-[85vw] transition-transform duration-200 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {panel(true, false, true)}
        </aside>
      </div>
    </>
  );
}
