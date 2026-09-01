import { Skeleton } from "@/components/ui/skeleton";

export function SignInFormSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />

      <div className="text-center">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
