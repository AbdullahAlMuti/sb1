import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Props = {
  phone_number: string;
  message?: string | null;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
};

export function WhatsAppButton({
  phone_number,
  message,
  className,
  size = "sm",
}: Props) {
  const href = buildWhatsAppLink({ phone_number, message });
  if (!href) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size={size}
          className={
            "h-9 gap-2 px-4 rounded-xl shadow-md hover:shadow-lg transition-all bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 " +
            (className ?? "")
          }
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Chat on WhatsApp</TooltipContent>
    </Tooltip>
  );
}
