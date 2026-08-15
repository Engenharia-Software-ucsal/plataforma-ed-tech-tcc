import { Users } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type OccupancyLevel = "vazio" | "moderado" | "cheio";

const LABEL: Record<OccupancyLevel, string> = {
  vazio: "Vazio",
  moderado: "Moderada",
  cheio: "Cheio",
};

const TONE: Record<OccupancyLevel, "success" | "warning" | "danger"> = {
  vazio: "success",
  moderado: "warning",
  cheio: "danger",
};

const ICON_COLOR: Record<OccupancyLevel, string> = {
  vazio: "#10B981",
  moderado: "#F59E0B",
  cheio: "#EF4444",
};

export function OccupancyTag({ level }: { level: OccupancyLevel }) {
  return (
    <Chip
      label={LABEL[level]}
      tone={TONE[level]}
      icon={<Users size={11} color={ICON_COLOR[level]} />}
    />
  );
}
