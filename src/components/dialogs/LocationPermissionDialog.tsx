import { MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** User accepted the rationale — caller should then request OS location. */
  onAllow: () => void;
  /** Permission was previously denied at OS level. */
  previouslyDenied?: boolean;
};

/**
 * In-app rationale shown BEFORE the system location prompt (Play best practice).
 */
export function LocationPermissionDialog({
  open,
  onOpenChange,
  onAllow,
  previouslyDenied = false,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">
            {previouslyDenied ? "Location access is off" : "Use your location?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            {previouslyDenied ? (
              <>
                Samaj needs location permission to suggest a city for your post. Enable Location for
                Samaj in your device Settings, then try again. You can always type a place manually
                instead.
              </>
            ) : (
              <>
                Samaj can use your <strong className="text-foreground">approximate location</strong>{" "}
                to add a city or area to this post. We only access location when you choose to, and
                we do not track you in the background.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {previouslyDenied ? (
            <AlertDialogAction
              className="w-full rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Got it
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogAction
                className="w-full rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenChange(false);
                  onAllow();
                }}
              >
                Allow location
              </AlertDialogAction>
              <AlertDialogCancel className="w-full rounded-xl mt-0">Not now</AlertDialogCancel>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
