import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
      variants: {
        variant: {
          default:
            "bg-primary text-primary-foreground shadow hover:bg-[#2563eb] h-11 lg:h-9 px-4",
          destructive:
            "bg-[#ef4444] text-destructive-foreground shadow-sm hover:bg-[#ef4444]/90 h-11 lg:h-9 px-4",
          outline:
            "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-11 lg:h-9 px-4",
          secondary:
            "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-11 lg:h-9 px-4",
          ghost: "hover:bg-accent hover:text-accent-foreground h-11 lg:h-9 px-4",
          link: "text-primary underline-offset-4 hover:underline h-auto px-0",
        },
        size: {
          default: "h-9 px-4",
          sm: "h-[30px] rounded-md px-[10px] text-[13px]",
          lg: "h-9 rounded-md px-4",
          icon: "h-11 w-11 lg:h-[30px] lg:w-[30px]",
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