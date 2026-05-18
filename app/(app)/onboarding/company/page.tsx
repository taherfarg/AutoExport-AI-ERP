import { createCompany } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CompanyOnboardingPage() {
  async function createCompanyFromForm(formData: FormData) {
    "use server";

    await createCompany(formData);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create dealership workspace</CardTitle>
          <CardDescription>
            Set the company identity used for tenant isolation, billing, and branch setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCompanyFromForm} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" name="legalName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Workspace slug</Label>
              <Input id="slug" name="slug" required aria-label="Workspace slug example: pollux-motors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="countryCode">Country</Label>
                <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} required />
              </div>
            </div>
            <Button type="submit">Create workspace</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
