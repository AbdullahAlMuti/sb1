import React from "react";
import PagesAndFeaturesControl from "../PagesAndFeaturesControl";
import ShopifyBottomStrip from "../ShopifyBottomStrip";

export function ShopifyPages() {
  return (
    <div className="space-y-6">
      <PagesAndFeaturesControl onManageContent={(key) => console.log("Manage content:", key)} />
      <ShopifyBottomStrip />
    </div>
  );
}
