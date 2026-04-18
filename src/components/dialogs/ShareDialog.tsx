import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share2, Copy, MessageCircle, Mail, Facebook, Twitter, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  url?: string;
  onCopy?: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  title = "Check this out!",
  url = "https://samaj.app/content/123",
  onCopy,
}: ShareDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    onCopy?.();
    toast({
      title: "Link Copied!",
      description: "The link has been copied to your clipboard.",
    });
  };

  const shareOptions = [
    { 
      id: "whatsapp", 
      label: "WhatsApp", 
      icon: MessageCircle, 
      color: "bg-green-500 hover:bg-green-600 text-white",
      url: `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`
    },
    { 
      id: "facebook", 
      label: "Facebook", 
      icon: Facebook, 
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    { 
      id: "twitter", 
      label: "Twitter", 
      icon: Twitter, 
      color: "bg-sky-500 hover:bg-sky-600 text-white",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    { 
      id: "linkedin", 
      label: "LinkedIn", 
      icon: Linkedin, 
      color: "bg-blue-700 hover:bg-blue-800 text-white",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    },
    { 
      id: "email", 
      label: "Email", 
      icon: Mail, 
      color: "bg-gray-600 hover:bg-gray-700 text-white",
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share
          </DialogTitle>
          <DialogDescription>
            Share this with your friends and family
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {shareOptions.map((option) => (
              <a
                key={option.id}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${option.color}`}
              >
                <option.icon className="h-5 w-5" />
                <span className="text-xs">{option.label}</span>
              </a>
            ))}
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Or copy link</p>
            <div className="flex gap-2">
              <Input 
                value={url}
                readOnly
                className="flex-1"
              />
              <Button onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
