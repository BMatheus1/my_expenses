"use client";

type DailyReviewCardProps = {
  todayTotalLabel: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function DailyReviewCard({
  todayTotalLabel,
  onOpen,
  onDismiss,
}: DailyReviewCardProps) {
  return (
    <section className="app-card-soft rounded-3xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="app-title text-base font-black">Hoje foi corrido?</h2>
          <p className="app-muted mt-1 text-sm leading-6">
            Você registrou {todayTotalLabel} hoje. Revise em menos de 1 minuto.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="touch-button rounded-full border border-[var(--app-border)] px-4 py-2 text-sm font-black text-[var(--app-muted)]"
          >
            Agora não
          </button>

          <button
            type="button"
            onClick={onOpen}
            className="app-button-primary touch-button px-5 py-3 text-sm"
          >
            Fechar o dia
          </button>
        </div>
      </div>
    </section>
  );
}
