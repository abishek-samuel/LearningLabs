import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, Eye, EyeOff, Mic } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useMsal } from "@azure/msal-react";
import { useErrorHandler } from "@/hooks/use-error-handler";

const clientId =
  "986989868035-bbbpdr11ndnft9igim3p4oj5ha9mc658.apps.googleusercontent.com";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional().default(false),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const { handleError } = useErrorHandler();
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { instance } = useMsal();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      console.log("Login error:", error);
      toast({
        title: "Login failed",
        description: "Please check your email and password and try again.",
        variant: "destructive",
      });
      // handleError(error);
    }
  };


  const handleMicrosoftLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup({
        scopes: ["user.read"],
      });

      const account = loginResponse.account;

      const payload = {
        email: account.username,
        username: account.name,
        password: "",
        firstName: account.name?.split(" ")[0],
        lastName: account.name?.split(" ")[1] || "",
        profilePicture: null,
      };

      // ✅ Reusing the same API as Google login
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title:
            "Sign up successful! You will receive an email after approval from the admin.",
          description: "Please check your email",
        });
        // Optional: Redirect
        // window.location.href = "/";
      } else {
        toast({
          title: "Already Registered",
          description: data.message || "Email or Username already exists.",
        });
      }
    } catch (err) {
      console.error("Microsoft login error:", err);
      toast({
        title: "Login Failed",
        description: "Something went wrong. Please try again!",
      });
    }
  };

  const handleGoogleLoginSuccess = async (response) => {
    try {
      const token = response.credential;
      const user = jwtDecode(token); // Decode the JWT token

      const payload = {
        email: user.email,
        username: user.name,
        password: "",
        firstName: user.given_name, // First name from Google profile
        lastName: user.family_name, // Last name from Google profile
        profilePicture: user.picture || null, // Optional profile picture
      };

      const apiResponse = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok && data.success) {
        // If the response is successful, show success toast
        toast({
          title:
            "Sign up successful! You will receive an email after approval from the admin.",
          description: "Please check your email",
        });
        // Redirect to home or login page after successful sign-up
        // window.location.href = '/';
      } else {
        // If the response is not successful, show the error message
        toast({
          title: "Already Registered",
          description: data.message, // Error message from the server
        });
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again!",
      });
    }
  };

  const handleGoogleLoginFailure = () => {
    toast({
      title: "Failed",
      description: "Please check your email",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="text-blue-600 dark:text-blue-400 h-5 w-5" />
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Account Details
          </h3>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="you@example.com"
                    {...field}
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    autoComplete="current-password"
                    className="pl-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-slate-500 dark:border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-slate-900 dark:text-white">
                    Remember me
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <Button
            variant="link"
            className="px-0 font-normal text-blue-600 dark:text-blue-400"
            type="button"
            onClick={() => setLocation("/forgot-password")}
          >
            Forgot password?
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">
              Or
            </span>
          </div>
        </div>

        <GoogleOAuthProvider clientId={clientId}>
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginFailure}
          />
        </GoogleOAuthProvider>

      </form>
      <Button
        type="button"
        onClick={handleMicrosoftLogin}
        className="relative w-full mt-4 flex items-center justify-center border border-gray-300 bg-white hover:bg-blue-50 text-[14px] font-normal text-black-100 font-sans dark:text-black py-2 px-4 rounded-md shadow-sm"
      >
        <span className="absolute left-4 flex items-center">
          <svg
            className="w-5 h-5"
            viewBox="0 0 23 23"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
        </span>
        <span className="ml-6">Sign in with Microsoft</span>
      </Button>


    </Form>
  );
}

export default LoginForm;
