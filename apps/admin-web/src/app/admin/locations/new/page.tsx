import dynamic from "next/dynamic";

const LocationCreationForm = dynamic(
  () => import("@/components/admin/LocationCreationForm"),
  { ssr: false }
);

export default function NewLocationPage() {
  return <LocationCreationForm />;
}
