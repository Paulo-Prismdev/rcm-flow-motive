import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
      variants: {
        variant: {
          default:
            "bg-primary text-primary-foreground shadow-card hover:bg-primary/90 h-11 lg:h-9 px-4",
          destructive:
            "bg-destructive text-destructive-foreground shadow-card hover:bg-destructive/90 h-11 lg:h-9 px-4",
          // The design system's one name for it; "destructive" stays for existing screens.
          danger:
            "bg-destructive text-destructive-foreground shadow-card hover:bg-destructive/90 h-11 lg:h-9 px-4",
          outline:
            "border border-input bg-card text-foreground shadow-card hover:bg-accent hover:text-accent-foreground h-11 lg:h-9 px-4",
          secondary:
            "border border-border bg-secondary text-secondary-foreground hover:bg-accent h-11 lg:h-9 px-4",
          ghost: "hover:bg-accent hover:text-accent-foreground h-11 lg:h-9 px-4",
          link: "text-link underline-offset-4 hover:underline h-auto px-0",
        },
        size: {
          default: "h-9 px-4",
          sm: "h-8 px-[10px] text-[13px]",
          lg: "h-9 px-4",
          icon: "h-11 w-11 lg:h-8 lg:w-8",
        },
      },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }