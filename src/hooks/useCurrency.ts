import { useSession } from "@/lib/auth-client";
import { getCurrencySymbolByName } from "@/lib/location-data";
import { useEffect, useState } from "react";

export function useCurrency() {
  const { data: session } = useSession();
  const [currencySymbol, setCurrencySymbol] = useState("$");

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (session?.user?.id) {
        try {
          const token = localStorage.getItem("bearer_token");
          const response = await fetch(`/api/profile?userId=${session.user.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const profile = await response.json();
            if (profile.country) {
              const symbol = getCurrencySymbolByName(profile.country);
              setCurrencySymbol(symbol);
            }
          }
        } catch (error) {
          console.error("Error fetching user country:", error);
        }
      }
    };

    fetchUserCountry();
  }, [session?.user?.id]);

  return { currencySymbol };
}