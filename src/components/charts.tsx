import { useMemo } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Filler);
ChartJS.defaults.color = "#A7ABB6";
ChartJS.defaults.font.family = "'Vazirmatn Variable', system-ui, sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.tooltip.rtl = true;
ChartJS.defaults.plugins.tooltip.textDirection = "rtl";

const NEON = "#D7FF1F";

export function KayarLine({ labels, values, label = "بازدید" }: { labels: string[]; values: number[]; label?: string }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: NEON,
          backgroundColor: "rgba(215,255,31,0.14)",
          fill: true,
          tension: 0.38,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#0A0C0E",
          pointBorderColor: NEON,
          pointBorderWidth: 2,
          borderWidth: 2.4,
        },
      ],
    }),
    [labels, values, label],
  );
  return (
    <div className="relative h-48">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              backgroundColor: "#171B21",
              borderColor: "#2E353D",
              borderWidth: 1,
              titleColor: "#E9EBEE",
              bodyColor: "#A7ABB6",
              padding: 10,
              displayColors: false,
            },
            legend: { display: false },
          },
          scales: {
            x: { grid: { color: "rgba(36,42,49,0.6)" }, border: { display: false } },
            y: { grid: { color: "rgba(36,42,49,0.6)" }, border: { display: false }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function KayarDoughnut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const chart = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.color),
          borderColor: "#101317",
          borderWidth: 4,
          hoverOffset: 6,
        },
      ],
    }),
    [data],
  );
  return (
    <div className="relative mx-auto h-[170px] w-[170px]">
      <Doughnut
        data={chart}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: { legend: { display: false } },
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-extrabold">۱۲,۴۸۲</span>
        <span className="label-muted text-[0.68rem]">بازدید کل</span>
      </div>
    </div>
  );
}

export function KayarBars({ labels, values, label = "فعالیت" }: { labels: string[]; values: number[]; label?: string }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: values.map((_, i) => (i === values.length - 1 ? NEON : "rgba(215,255,31,0.35)")),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
    }),
    [labels, values, label],
  );
  return (
    <div className="relative h-40">
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: { grid: { color: "rgba(36,42,49,0.6)" }, border: { display: false }, beginAtZero: true, ticks: { precision: 0 } },
          },
        }}
      />
    </div>
  );
}
