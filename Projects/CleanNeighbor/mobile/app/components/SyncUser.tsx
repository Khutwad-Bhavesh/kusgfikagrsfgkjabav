import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { supabase } from "../../lib/supabase";

export default function SyncUser() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUserToSupabase = async () => {
      try {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("clerkId")
          .eq("clerkId", user.id)
          .single();

        if (!existingUser) {
          // Insert user
          const name = user.fullName || user.firstName || "Unknown User";
          const email = user.primaryEmailAddress?.emailAddress || "";
          
          await supabase.from("users").insert({
            clerkId: user.id,
            name: name,
            email: email,
            role: "citizen" // Default role
          });
          console.log("User synced to Supabase");
        }
      } catch (error) {
        console.error("Error syncing user to Supabase:", error);
      }
    };

    syncUserToSupabase();
  }, [user, isLoaded]);

  return null;
}
