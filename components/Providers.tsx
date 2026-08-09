"use client";

import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { UserModeProvider } from "@/lib/UserModeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { PropertyProvider } from "@/lib/PropertyContext";
import { AnnouncementProvider } from "@/lib/AnnouncementContext";
import { ComplaintProvider } from "@/lib/ComplaintContext";
import { PGConfigProvider } from "@/lib/PGConfigContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { BedProvider } from "@/lib/BedContext";
import { RoomProvider } from "@/lib/RoomContext";
import { CheckoutProvider } from "@/lib/CheckoutContext";
import { ActivityProvider } from "@/lib/ActivityContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PropertyProvider>
        <PGConfigProvider>
          <SettingsProvider>
            <LanguageProvider>
              <UserModeProvider>
                <ActivityProvider>
                    <AnnouncementProvider>
                        <ComplaintProvider>
                          <BedProvider>
                            <RoomProvider>
                              <CheckoutProvider>
                                {children}
                                <Toaster
                                  position="top-right"
                                  richColors
                                  closeButton
                                  toastOptions={{ duration: 3500 }}
                                />
                              </CheckoutProvider>
                            </RoomProvider>
                          </BedProvider>
                        </ComplaintProvider>
                    </AnnouncementProvider>
                </ActivityProvider>
              </UserModeProvider>
            </LanguageProvider>
          </SettingsProvider>
        </PGConfigProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
