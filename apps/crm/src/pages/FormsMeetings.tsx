import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { parseFormsMeetingsTab } from "../lib/formsMeetingsTab";
import { BookingSettings } from "../components/booking/BookingSettings";

/**
 * « Formulaires et rendez-vous » (menu Marketing, CR du 09/10/2026) :
 * module de prise de rendez-vous et formulaires intégrables, sur le modèle
 * de Brevo. Le contenu des deux onglets est livré par les tâches S39-3 et
 * S39-10.
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
          <p className="text-sm text-muted-foreground">Formulaires intégrables : bientôt disponible.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
