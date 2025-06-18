import { toast } from "sonner";

// Re-export the toast function for compatibility
export { toast };

// Create a custom hook that matches the expected interface
export function useToast() {
  return {
    toast: (options: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      if (options.variant === "destructive") {
        toast.error(options.title || "Error", {
          description: options.description,
        });
      } else {
        toast.success(options.title || "Success", {
          description: options.description,
        });
      }
    },
  };
}
