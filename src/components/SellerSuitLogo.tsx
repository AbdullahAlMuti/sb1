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
        className="relative grid place-items-center rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-sm"
        style={{ width: icon, height: icon }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        aria-hidden
      >
        <svg
          width={Math.round(icon * 0.58)}
          height={Math.round(icon * 0.58)}
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.8 8.2C18.5 6.9 16.6 6 14 6c-3.9 0-6.5 1.9-6.5 4.7 0 3.2 3.2 4 6.4 4.6 2.8.6 4.2 1 4.2 2.5 0 1.4-1.5 2.3-4 2.3-2.6 0-4.7-.9-6.2-2.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 5.5l2.2-2.2M23 9h3M6.8 22.4l-2.1 2.1M5 19H2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
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
