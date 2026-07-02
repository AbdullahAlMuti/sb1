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
        className="relative grid place-items-center overflow-hidden rounded-lg shadow-sm"
        style={{ width: icon, height: icon }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <rect width="32" height="32" rx="8" fill="#0f172a" />
          <g transform="translate(16, 16) scale(1.25) translate(-16, -16)">
            <path
              d="M9 13C9 10.791 10.791 9 13 9h6.4c2.209 0 4 1.791 4 4v0c0 1.326-1.074 2.4-2.4 2.4H13c-2.209 0-4 1.791-4 4v0c0 2.209 1.791 4 4 4h6.4c2.209 0 4-1.791 4-4"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
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
