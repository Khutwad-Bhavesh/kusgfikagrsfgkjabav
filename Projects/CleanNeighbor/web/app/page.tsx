"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useDatabaseQuery } from "../hooks/useDatabase";
// @ts-nocheck
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const AdminLogin = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Get user data from Convex to check role
  const convexUserArr = useDatabaseQuery("users") as any[];
  const convexUser = convexUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Redirect admin users to dashboard
  useEffect(() => {
    if (isLoaded && user && convexUser) {
      if (convexUser.role === "admin") {
        router.push("/admin");
      }
    }
  }, [isLoaded, user, convexUser, router]);

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 mt-[-40px]">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Admin Portal
          </h2>
          <p className="text-slate-600">
            Sign in to access the dashboard
          </p>
        </div>
        
        <SignIn 
          routing="hash"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl border-0 rounded-lg",
              headerTitle: "text-slate-900",
              headerSubtitle: "text-slate-600",
              socialButtonsBlockButton: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700",
              socialButtonsBlockButtonText: "font-medium",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm font-medium",
              footerActionLink: "text-blue-600 hover:text-blue-700",
              identityPreviewText: "text-slate-700",
              identityPreviewEditButtonIcon: "text-slate-500"
            }
          }}
          localization={{
            signIn: {
              start: {
                title: "Sign in to Shuchithvam",
                subtitle: "Welcome back! Please sign in to continue",
              }
            }
          }}
          signUpUrl={undefined}
          afterSignInUrl="/admin"
          redirectUrl="/admin"
        />
        
        {user && convexUser && convexUser.role !== "admin" && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center font-medium">
              Access denied. Admin privileges required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;