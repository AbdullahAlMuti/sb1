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
        className="relative grid place-items-center overflow-hidden"
        style={{ width: icon, height: icon }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        aria-hidden
      >
        <img
          src="/logo.png"
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </motion.div>

      {showText && (
        <span className={`font-display ${text} font-bold tracking-tight text-foreground`}>
          SellerSuit
        </span>
      )}
    </div>
  );
};

export default SellerSuitLogo;
