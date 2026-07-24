"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, Chip, Button } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useComplaints } from "@/lib/ComplaintContext";

const priorityColor = {
  High: "danger" as const,
  Medium: "warning" as const,
  Low: "success" as const,
};

export default function ComplaintsList() {
  const { t } = useLanguage();
  const { complaints, loading } = useComplaints();

  if (loading) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0 flex items-center justify-between">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("complaints.urgentComplaints")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="px-5 pt-5 pb-0 flex items-center justify-between">
        <Card.Title className="text-sm font-semibold text-slate-800">
          {t("complaints.urgentComplaints")}
        </Card.Title>
        <Link href="/complaints">
          <Button variant="ghost" size="sm">
            {t("common.viewAll")}
          </Button>
        </Link>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-4">
        <div className="space-y-2.5">
          {complaints.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No complaints</p>
          ) : (
            complaints.slice(0, 4).map((complaint) => (
              <div
                key={complaint.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle size={14} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {complaint.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{complaint.time}</p>
                  </div>
                </div>
                <Chip size="sm" variant="soft" color={priorityColor[complaint.priority]}>
                  {complaint.priority}
                </Chip>
              </div>
            ))
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
