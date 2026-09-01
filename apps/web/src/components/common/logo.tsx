import { Link } from "@tanstack/react-router";
import useProjectStore from "@/store/project";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const { setProject } = useProjectStore();

  return (
    <Link
      aria-label="MAKI home"
      onClick={() => {
        setProject(undefined);
      }}
      to="/dashboard"
      className={`w-auto font-mono font-semibold text-[15px] tracking-[0.24em] ${className}`}
    >
      MAKI
    </Link>
  );
}
