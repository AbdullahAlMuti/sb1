import { motion } from "framer-motion";

interface SellerSuitLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SellerSuitLogo = ({ size = "md", showText = true }: SellerSuitLogoProps) => {
  const sizes = {
    sm: { icon: 30, text: "text-lg" },
    md: { icon: 38, text: "text-xl" },
    lg: { icon: 52, text: "text-3xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        className="relative grid place-items-center overflow-hidden rounded-lg bg-white dark:bg-white/95 p-0.5 shadow-xs border border-black/5"
        style={{ width: icon, height: icon }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        aria-hidden
      >
        <img
          src="/logo.png"
          alt="SellerSuit"
          className="h-full w-full object-contain"
          loading="eager"
        />
      </motion.div>

      <span className={`font-display ${text} font-bold tracking-tight text-foreground transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden origin-left ${showText ? "opacity-100 max-w-[150px] translate-x-0" : "opacity-0 max-w-0 -translate-x-2"}`}>
        SellerSuit
      </span>
    </div>
  );
};

export default SellerSuitLogo;
