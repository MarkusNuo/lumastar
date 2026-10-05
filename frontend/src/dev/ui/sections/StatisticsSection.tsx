import { showToast } from '../../../components/ui/toastStore';
import { ActivityHeatmap } from '../../../features/stats/ActivityHeatmap';
import { ForecastCard } from '../../../features/stats/ForecastCard';
import { LevelProgressCard } from '../../../features/stats/LevelProgressCard';
import { MasteryCard } from '../../../features/stats/MasteryCard';
import { SAMPLE_STATS } from '../../../features/stats/sampleStats';
import { StatsSummary } from '../../../features/stats/StatsSummary';
import { TopErrorsCard } from '../../../features/stats/TopErrorsCard';
import { Specimen } from '../CatalogSection';

const practise = (skillTag: string) => showToast(`Gezielt üben: ${skillTag}`, { tone: 'primary' });

export function StatisticsSection() {
  return (
    <>
      <Specimen label="Streak, Rekord und gelernte Wörter" layout="stack">
        <StatsSummary
          streak={{ current: 6, longest: 21 }}
          learnedWords={SAMPLE_STATS.learnedWords}
        />
      </Specimen>
      <Specimen label="Niveau und Weg zur nächsten Stufe · vor der Einstufung" layout="stack">
        <LevelProgressCard level={SAMPLE_STATS.level} />
        <LevelProgressCard level={undefined} />
      </Specimen>
      <Specimen label="Können pro Bereich" layout="stack">
        <MasteryCard areas={SAMPLE_STATS.masteryByArea} />
      </Specimen>
      <Specimen label="Häufigste Fehler mit „Gezielt üben“ · ohne Fehler" layout="stack">
        <TopErrorsCard errors={SAMPLE_STATS.topErrors} onPractice={practise} />
        <TopErrorsCard errors={[]} onPractice={practise} />
      </Specimen>
      <Specimen label="Kalender der Lerntage (seitlich scrollbar)" layout="stack">
        <ActivityHeatmap heatmap={SAMPLE_STATS.heatmap} />
      </Specimen>
      <Specimen label="FSRS-Prognose: morgen fällig und 7 Tage" layout="stack">
        <ForecastCard
          forecast={SAMPLE_STATS.forecast}
          onReview={() => showToast('Zu Wiederholen', { tone: 'primary' })}
        />
      </Specimen>
    </>
  );
}
