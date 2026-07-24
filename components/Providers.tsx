"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { UserModeProvider } from "@/lib/UserModeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { PropertyProvider } from "@/lib/PropertyContext";
import { VisitRequestProvider } from "@/lib/VisitRequestContext";
import { AnnouncementProvider } from "@/lib/AnnouncementContext";
import { ExpenseProvider } from "@/lib/ExpenseContext";
import { ComplaintProvider } from "@/lib/ComplaintContext";
import { PGConfigProvider } from "@/lib/PGConfigContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import { BedProvider } from "@/lib/BedContext";
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
                  <VisitRequestProvider>
                    <AnnouncementProvider>
                      <ExpenseProvider>
                        <ComplaintProvider>
                          <BedProvider>
                            <CheckoutProvider>{children}</CheckoutProvider>
                          </BedProvider>
                        </ComplaintProvider>
                      </ExpenseProvider>
                    </AnnouncementProvider>
                  </VisitRequestProvider>
                </ActivityProvider>
              </UserModeProvider>
            </LanguageProvider>
          </SettingsProvider>
        </PGConfigProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
