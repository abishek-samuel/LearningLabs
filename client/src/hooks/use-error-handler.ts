import { useToast } from "./use-toast";

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: any) => {
    let message = "An unexpected error occurred";

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    }

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });

    return message;
  };

  return { handleError };
}
