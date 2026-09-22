import { Metrics, Simulation } from "../lib/types";
import { Button } from "./ui/button";

type BoxReviewProps = {
  metrics: Metrics | null;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  simulation: Simulation | null;
  isSimulating: boolean;
  canSimulate: boolean;
  onSimulate: () => void;
};

const formatProbabilityPercent = (value: number) =>
  value ? `${(value / 10000).toFixed(2)}%` : "--";
const translateError = (error: string) =>
  error
    .replace(
      "Box price must be greater than 0.",
      "Box-ийн үнэ 0-ээс их байх ёстой.",
    )
    .replace(
      "Box price must be a whole number greater than 0.",
      "Box-ийн үнэ 0-ээс их бүхэл тоо байх ёстой.",
    )
    .replace(
      "Item list cannot be empty.",
      "Хамгийн багадаа нэг item оруулна уу.",
    )
    .replace(/Item (\d+) name is required\./, "Item $1-ийн нэрийг оруулна уу.")
    .replace(/Duplicate item name: (.+)\./, "Давхардсан item-ийн нэр: $1.")
    .replace(
      /Item (\d+) has 0 PPM probability and will never be selected\./,
      "Анхаар: Item $1-ийн probability 0 PPM тул сонгогдохгүй.",
    )
    .replace(
      /Item (\d+) value must be greater than 0\./,
      "Item $1-ийн үнэ 0-ээс их байх ёстой.",
    )
    .replace(
      /Item (\d+) probability must be greater than 0\./,
      "Item $1-ийн probability 0-ээс их байх ёстой.",
    )
    .replace(
      "Total probability must equal 1000000 PPM. Current total:",
      "Нийт probability 1,000,000 PPM байх ёстой. Одоогийн дүн:",
    )
    .replace(
      "Platform profit rule is not satisfied. Required minimum profit:",
      "Platform profit-ийн дүрэм биелсэнгүй. Шаардлагатай доод ашиг:",
    );

function SimulationHistogram({ simulation }: { simulation: Simulation }) {
  const bins = new Map<number, number>();
  simulation.profitLosses.forEach((value) =>
    bins.set(value, (bins.get(value) || 0) + 1),
  );
  const entries = [...bins.entries()].sort(([left], [right]) => left - right);
  const maximumCount = Math.max(...entries.map(([, count]) => count));

  return (
    <div className="simulation-result">
      <div className="simulation-summary">
        <span>
          {simulation.openingCount.toLocaleString()} удаа нээхэд платформын нийт
          үр дүн
        </span>
        <strong
          className={
            simulation.totalProfitLossMnt >= 0 ? "good-text" : "bad-text"
          }
        >
          {simulation.totalProfitLossMnt >= 0 ? "+" : ""}
          {simulation.totalProfitLossMnt.toLocaleString()} MNT
        </strong>
      </div>
      <div
        className="histogram"
        aria-label="Нэг нээлтэд гарах платформын ашиг, алдагдлын тархалт"
      >
        {entries.map(([value, count]) => (
          <div className="histogram-row" key={value}>
            <span>
              {value >= 0 ? "+" : ""}
              {value.toLocaleString()} ₮
            </span>
            <i
              className={value >= 0 ? "profit-bar" : "loss-bar"}
              style={{ width: `${Math.max(5, (count / maximumCount) * 100)}%` }}
            />
            <b>{count} удаа</b>
          </div>
        ))}
      </div>
      <p className="histogram-help">
        Зүүн талын дүн нь нэг box нээхэд платформд үлдэх ашиг (+) эсвэл гарах
        алдагдал (-). Барын урт нь тэр үр дүн хэдэн удаа давтагдсаныг харуулна.
      </p>
      <small className="simulation-range">
        Хамгийн их алдагдал: {simulation.minimumProfitLossMnt.toLocaleString()}{" "}
        ₮<span> · </span>
        Дундаж үр дүн: {simulation.averageProfitLossMnt.toLocaleString()} ₮
        <span> · </span>
        Хамгийн их ашиг: {simulation.maximumProfitLossMnt.toLocaleString()} ₮
      </small>
    </div>
  );
}

export default function BoxReview({
  metrics,
  errors,
  warnings,
  isValid,
  simulation,
  isSimulating,
  canSimulate,
  onSimulate,
}: BoxReviewProps) {
  const probabilityTotal = metrics?.totalPpm ?? 0;

  return (
    <aside className="panel review-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">03 / DECISION</p>
          <h2>Тооцооллын шалгалт</h2>
          <p className="review-intro">
            Энд box ашигтай эсэх, хэрэглэгч хожих магадлал, засах шаардлагатай
            зүйлсийг шууд харна.
          </p>
        </div>
        <span className={`validity ${isValid ? "valid" : "invalid"}`}>
          {isValid ? "ЗӨВ" : "ЗАСАХ ХЭРЭГТЭЙ"}
        </span>
      </div>
      <div className="metric-list">
        <div>
          <span>Хүлээгдэх утга (EV)</span>
          <strong>
            {metrics?.expectedValueMnt?.toLocaleString() || "--"} MNT
          </strong>
        </div>
        <div>
          <span>Платформын хүлээгдэх ашиг</span>
          <strong>
            {metrics?.expectedPlatformProfitMnt?.toLocaleString() || "--"} MNT
          </strong>
        </div>
        <div>
          <span>Хэрэглэгчид буцах хувь (RTP)</span>
          <strong>
            {metrics?.rtpBps ?? "--"} BPS / {metrics?.rtpPercent ?? "--"}%
          </strong>
        </div>
        <div>
          <span>Платформын давуу тал (house edge)</span>
          <strong>
            {metrics?.houseEdgeBps ?? "--"} BPS /{" "}
            {metrics?.houseEdgePercent ?? "--"}%
          </strong>
        </div>
        <div>
          <span>Хэрэглэгч үнэ цэнээсээ их item авах магадлал</span>
          <strong>
            {metrics?.userProfitProbabilityPpm?.toLocaleString() || "--"} PPM /{" "}
            {metrics?.userProfitProbabilityPercent ?? "--"}%
          </strong>
        </div>
        <div>
          <span>Нийт магадлалын хуваарилалт</span>
          <strong
            className={probabilityTotal === 1000000 ? "good-text" : "bad-text"}
          >
            {probabilityTotal.toLocaleString()} PPM /{" "}
            {formatProbabilityPercent(probabilityTotal)} / 100.00%
            {metrics && metrics.differencePpm !== 0
              ? ` (${metrics.differencePpm > 0 ? "+" : ""}${metrics.differencePpm.toLocaleString()} PPM зөрүү)`
              : ""}
          </strong>
        </div>
      </div>
      <div className="simulation-section">
        <div>
          <p className="section-kicker">04 / SIMULATION</p>
          <h3>1,000 удаа нээвэл ямар үр дүн гарах вэ?</h3>
          <p className="simulation-description">
            Санамсаргүй 1,000 нээлтийг туршиж, платформын ашиг ба алдагдлын
            хэлбэлзлийг харуулна.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={!canSimulate || isSimulating}
          onClick={onSimulate}
        >
          {isSimulating ? "Тооцож байна..." : "Тархалт тооцох"}
        </Button>
      </div>
      {simulation ? (
        <SimulationHistogram simulation={simulation} />
      ) : (
        <p className="simulation-empty">
          Draft хадгалсны дараа энд 1,000 нээлтийн жишээ гарна. Энэ нь бодит
          хэрэглэгчийн үр дүн биш, box-ийн эрсдэлийг урьдчилан харах тооцоо юм.
        </p>
      )}
      <div className="rule-note">
        <span className="rule-dot" />
        Simulation нь зөвхөн хэлбэлзлийг харуулна. Шалгалтын үр дүнг үндэслэн
        PPM, үнэ, item болон RTP-ээ засна.
      </div>
      {errors.length > 0 && (
        <div className="error-list">
          <p>Дараах зүйлсийг засна уу:</p>
          {errors.map((error) => (
            <p key={error}>{translateError(error)}</p>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="warning-list">
          <p>Анхааруулга:</p>
          {warnings.map((warning) => (
            <p key={warning}>{translateError(warning)}</p>
          ))}
        </div>
      )}
    </aside>
  );
}
