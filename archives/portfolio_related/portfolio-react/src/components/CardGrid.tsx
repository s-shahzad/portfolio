import { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";

type CardGridProps = PropsWithChildren<{ cols?: "3" | "2" | "1" }>;

export default function CardGrid({ children, cols = "3" }: CardGridProps) {
  const reduced = useReducedMotion();
  const colClass = cols === "1" ? "grid-cols-1" : cols === "2" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  if (reduced) {
    return <div className={`grid ${colClass} gap-4`}>{children}</div>;
  }

  return (
    <motion.div
      className={`grid ${colClass} gap-4`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {children}
    </motion.div>
  );
}
