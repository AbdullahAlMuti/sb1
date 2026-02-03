import { motion } from "framer-motion";

interface SellerSuitLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const SellerSuitLogo = ({ size = "md", showText = true }: SellerSuitLogoProps) => {
  const sizes = {
    sm: { icon: 32, text: "text-lg" },
    md: { icon: 40, text: "text-xl" },
    lg: { icon: 56, text: "text-3xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {/* Flame particles */}
        <motion.div
          className="absolute -inset-1 -z-10"
          style={{ filter: 'blur(3px)' }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: icon * 0.3,
                height: icon * 0.4,
                left: `${20 + (i * 12)}%`,
                bottom: '10%',
                background: `linear-gradient(to top, hsl(24 85% 55%), hsl(38 92% 50%), transparent)`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              }}
              animate={{
                scaleY: [1, 1.3, 0.9, 1.2, 1],
                scaleX: [1, 0.9, 1.1, 0.95, 1],
                y: [0, -3, -1, -4, 0],
                opacity: [0.7, 0.9, 0.6, 0.85, 0.7],
              }}
              transition={{
                duration: 0.8 + (i * 0.1),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.div>

        {/* Outer flame glow */}
        <motion.div
          className="absolute -inset-2 rounded-full -z-20"
          style={{
            background: 'radial-gradient(circle, hsl(24 85% 55% / 0.4) 0%, hsl(38 92% 50% / 0.2) 40%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.15, 1.05, 1.2, 1],
            opacity: [0.5, 0.7, 0.55, 0.75, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <svg
          width={icon}
          height={icon}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg relative z-10"
        >
          {/* Background shield shape */}
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(262 83% 58%)" />
              <stop offset="100%" stopColor="hsl(280 70% 50%)" />
            </linearGradient>
            <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.3)" />
              <stop offset="100%" stopColor="hsl(280 70% 50% / 0.3)" />
            </linearGradient>
            <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(24 85% 55%)" />
              <stop offset="50%" stopColor="hsl(38 92% 50%)" />
              <stop offset="100%" stopColor="hsl(45 93% 60%)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="flameGlow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer shield */}
          <path
            d="M32 4L8 14V30C8 44.36 18.12 57.52 32 60C45.88 57.52 56 44.36 56 30V14L32 4Z"
            fill="url(#shieldGradient)"
            filter="url(#glow)"
          />
          
          {/* Inner shield highlight */}
          <path
            d="M32 10L14 18V30C14 41.28 22.24 51.16 32 53.4C41.76 51.16 50 41.28 50 30V18L32 10Z"
            fill="url(#innerGradient)"
          />
          
          {/* S Letter - Stylized */}
          <path
            d="M38 22C38 22 36 20 32 20C28 20 24 22 24 26C24 30 28 31 32 32C36 33 40 34 40 38C40 42 36 44 32 44C28 44 26 42 26 42"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Animated flame on top */}
          <motion.path
            d="M32 8C32 8 28 12 28 15C28 18 30 19 32 19C34 19 36 18 36 15C36 12 32 8 32 8Z"
            fill="url(#flameGradient)"
            filter="url(#flameGlow)"
            animate={{
              d: [
                "M32 8C32 8 28 12 28 15C28 18 30 19 32 19C34 19 36 18 36 15C36 12 32 8 32 8Z",
                "M32 6C32 6 27 11 27 14C27 17 29 19 32 19C35 19 37 17 37 14C37 11 32 6 32 6Z",
                "M32 7C32 7 29 11 29 14C29 17 30 18 32 18C34 18 35 17 35 14C35 11 32 7 32 7Z",
                "M32 8C32 8 28 12 28 15C28 18 30 19 32 19C34 19 36 18 36 15C36 12 32 8 32 8Z",
              ],
              opacity: [0.9, 1, 0.85, 0.9],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Small flame wisps */}
          <motion.path
            d="M30 10C30 10 28 13 28 14C28 15 29 16 30 15C31 14 30 10 30 10Z"
            fill="hsl(45 93% 60%)"
            animate={{
              opacity: [0.6, 1, 0.5, 0.8, 0.6],
              scale: [1, 1.1, 0.9, 1.05, 1],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.path
            d="M34 10C34 10 36 13 36 14C36 15 35 16 34 15C33 14 34 10 34 10Z"
            fill="hsl(45 93% 60%)"
            animate={{
              opacity: [0.5, 0.9, 0.6, 1, 0.5],
              scale: [1, 0.95, 1.1, 1, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.15,
            }}
          />
        </svg>
        
        {/* Animated ember particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`ember-${i}`}
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              background: 'hsl(38 92% 50%)',
              left: `${40 + (i * 5)}%`,
              top: '20%',
              boxShadow: '0 0 4px hsl(38 92% 50%)',
            }}
            animate={{
              y: [-5, -20, -35],
              x: [0, (i % 2 === 0 ? 5 : -5), (i % 2 === 0 ? 10 : -10)],
              opacity: [0.8, 0.5, 0],
              scale: [1, 0.8, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display ${text} font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent`}>
            SellerSuit
          </span>
        </div>
      )}
    </div>
  );
};

export default SellerSuitLogo;
