import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import SeasonalBanner from "@/components/SeasonalBanner";
import MegaNav from "@/components/homepage/MegaNav";
import SiteFooter from "@/components/homepage/SiteFooter";
import { fetchHomepageContent, getFallbackContent } from "@/lib/homepage-content";
import type { HomepageContent } from "@repo/types";

export default function MarketingLayout() {
  const [content, setContent] = useState<HomepageContent>(getFallbackContent);

  useEffect(() => {
    let active = true;
    fetchHomepageContent().then((c) => {
      if (active) setContent(c);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip link — first focusable element, lets keyboard/SR users jump past
          the banner + nav straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Announcement bar — sits above the nav; wires DB message/link text */}
      <SeasonalBanner announcement={content.announcement} />

      {/* Mega-menu nav */}
      <MegaNav nav={content.nav} />

      {/* Main Page Area */}
      <main id="main-content" tabIndex={-1} className="outline-none flex-1 flex flex-col">
        <Outlet context={{ content }} />
      </main>

      {/* Footer */}
      <SiteFooter footer={content.footer} />
    </div>
  );
}
