import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { buttonClass } from '../../components/ui/buttonStyles';
import { CatalogSection } from './CatalogSection';
import { AccountSection } from './sections/AccountSection';
import { ButtonsSection } from './sections/ButtonsSection';
import { ChoicesSection } from './sections/ChoicesSection';
import { ColorsSection } from './sections/ColorsSection';
import { ExercisesSection } from './sections/ExercisesSection';
import { FeedbackSection } from './sections/FeedbackSection';
import { GamificationSection } from './sections/GamificationSection';
import { InputsSection } from './sections/InputsSection';
import { JuiceSection } from './sections/JuiceSection';
import { ListsSection } from './sections/ListsSection';
import { MascotSection } from './sections/MascotSection';
import { NavigationSection } from './sections/NavigationSection';
import { PathSection } from './sections/PathSection';
import { PlacementPlanSection } from './sections/PlacementPlanSection';
import { ProgressSection } from './sections/ProgressSection';
import { RemindersSection } from './sections/RemindersSection';
import { ResultSection } from './sections/ResultSection';
import { ReviewCheckpointSection } from './sections/ReviewCheckpointSection';
import { StatisticsSection } from './sections/StatisticsSection';
import { StreakSection } from './sections/StreakSection';
import { SurfacesSection } from './sections/SurfacesSection';
import { WordTilesSection } from './sections/WordTilesSection';

const SECTIONS = [
  { id: 'farben', title: 'Farben', Content: ColorsSection },
  { id: 'buttons', title: 'Buttons', Content: ButtonsSection },
  { id: 'flaechen', title: 'Karten & Icon-Buttons', Content: SurfacesSection },
  { id: 'wortbausteine', title: 'Wortbausteine', Content: WordTilesSection },
  { id: 'auswahl', title: 'Auswahl', Content: ChoicesSection },
  { id: 'eingabe', title: 'Eingabe', Content: InputsSection },
  { id: 'fortschritt', title: 'Fortschritt', Content: ProgressSection },
  { id: 'feedback', title: 'Feedback', Content: FeedbackSection },
  { id: 'uebungen', title: 'Übungen', Content: ExercisesSection },
  { id: 'lektionsende', title: 'Lektionsende', Content: ResultSection },
  { id: 'lernpfad', title: 'Lernpfad', Content: PathSection },
  { id: 'wiederholen', title: 'Wiederholen & Checkpoints', Content: ReviewCheckpointSection },
  { id: 'einstufung', title: 'Einstufung & Lernplan', Content: PlacementPlanSection },
  { id: 'belohnung', title: 'Streak, XP & Niveau', Content: GamificationSection },
  { id: 'streak', title: 'Streak-Feier & Streak-Seite', Content: StreakSection },
  { id: 'statistik', title: 'Statistik', Content: StatisticsSection },
  { id: 'konto', title: 'Konto & Anmeldung', Content: AccountSection },
  { id: 'erinnerungen', title: 'Erinnerungen', Content: RemindersSection },
  { id: 'navigation', title: 'Navigation', Content: NavigationSection },
  { id: 'listen', title: 'Listen, Sheets & Toasts', Content: ListsSection },
  { id: 'maskottchen', title: 'Maskottchen', Content: MascotSection },
  { id: 'juice', title: 'Juice & Sound', Content: JuiceSection },
] as const;

/** Component catalog (PRD 12.5): every design-system component in all variants and states. */
export function CatalogPage() {
  return (
    <div className="mx-auto max-w-app px-gutter pb-28">
      <header className="sticky top-0 z-(--z-bar) -mx-gutter border-b-2 border-border bg-bg px-gutter pt-[calc(var(--safe-top)+0.75rem)] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro font-extrabold tracking-wider text-primary-soft uppercase">
              Lumastar Design-System
            </p>
            <h1 className="text-lead font-black">Komponenten-Katalog</h1>
          </div>
          <Link to="/" data-tone="neutral" className={buttonClass('neutral', 'sm')}>
            <ArrowLeftIcon aria-hidden="true" size={16} weight="bold" />
            App
          </Link>
        </div>
        <nav aria-label="Abschnitte" className="-mx-gutter mt-3 overflow-x-auto px-gutter">
          <ul className="flex w-max gap-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-full border-2 border-border px-3 py-1 text-caption font-extrabold whitespace-nowrap text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="flex flex-col gap-10 pt-6">
        {SECTIONS.map(({ id, title, Content }) => (
          <CatalogSection key={id} id={id} title={title}>
            <Content />
          </CatalogSection>
        ))}
      </div>
    </div>
  );
}
