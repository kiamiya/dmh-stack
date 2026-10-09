import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { parseFormsMeetingsTab } from "../lib/formsMeetingsTab";
import { BookingSettings } from "../components/booking/BookingSettings";
import { FormsSettings } from "../components/forms/FormsSettings";

/**
 * « Formulaires et rendez-vous » (menu Marketing, CR du 09/10/2026) :
 * module de prise de rendez-vous et formulaires intégrables, sur le modèle
 * de Brevo (S39-3 à S39-12).
 */
export function FormsMeetingsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = parseFormsMeetingsTab(searchParams.get("tab"));

  return (
    <div className="space-y-4 p-6">
      <PageHeader kicker="Marketing" title="Formulaires et rendez-vous" />
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="meetings">Rendez-vous</TabsTrigger>
          <TabsTrigger value="forms">Formulaires</TabsTrigger>
        </TabsList>
        <TabsContent value="meetings" className="pt-4">
          <BookingSettings />
        </TabsContent>
        <TabsContent value="forms" className="pt-4">
          <FormsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
