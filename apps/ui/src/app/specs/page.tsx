import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SpecsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Specs</h2>
        <p className="text-sm text-muted-foreground">
          Manage OpenSpec specs available to this agent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Spec browsing and syncing will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Planned: list specs, view versions, and pull specs on sandbox start.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
