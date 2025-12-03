import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "primary" | "secondary" | "accent" | "warm";
}

export function GradientCard({ children, className, gradient = "primary" }: GradientCardProps) {
  const gradientStyles = {
    primary: "before:bg-[linear-gradient(135deg,hsl(230_100%_65%),hsl(270_100%_63%))]",
    secondary: "before:bg-[linear-gradient(135deg,hsl(270_100%_63%),hsl(320_100%_64%))]",
    accent: "before:bg-[linear-gradient(135deg,hsl(320_100%_64%),hsl(25_100%_63%))]",
    warm: "before:bg-[linear-gradient(135deg,hsl(45_100%_64%),hsl(25_100%_63%))]",
  };

  return (
    <div
      className={cn(
        "relative rounded-xl bg-card p-6 overflow-hidden",
        "before:content-[''] before:absolute before:inset-0 before:p-[1px] before:rounded-xl",
        gradientStyles[gradient],
        "before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        "before:[mask-composite:exclude] before:[-webkit-mask-composite:xor]",
        "before:pointer-events-none before:opacity-50 before:transition-opacity before:duration-300",
        "hover:before:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}
