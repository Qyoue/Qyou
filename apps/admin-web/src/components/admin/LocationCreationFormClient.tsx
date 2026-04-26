"use client";

import dynamic from "next/dynamic";

const LocationCreationForm = dynamic(
  () => import("@/components/admin/LocationCreationForm"),
  { ssr: false }
);

export default function LocationCreationFormClient() {
  return <LocationCreationForm />;
}
